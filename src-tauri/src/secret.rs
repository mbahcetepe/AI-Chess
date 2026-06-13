//! API anahtarlarını Windows DPAPI ile şifreler/çözer.
//! DPAPI, veriyi Windows kullanıcı hesabına bağlar — başka kullanıcı/işlem çözemez,
//! ayrı bir anahtar saklamaya gerek yoktur. Çıktı hex string olarak DB'ye yazılır.

#[cfg(windows)]
mod imp {
    use windows::Win32::Foundation::{LocalFree, HLOCAL};
    use windows::Win32::Security::Cryptography::{
        CryptProtectData, CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
    };
    use windows::core::PCWSTR;

    fn to_hex(b: &[u8]) -> String {
        let mut s = String::with_capacity(b.len() * 2);
        for x in b {
            s.push_str(&format!("{:02x}", x));
        }
        s
    }
    fn from_hex(s: &str) -> Result<Vec<u8>, String> {
        if s.len() % 2 != 0 {
            return Err("geçersiz hex uzunluğu".into());
        }
        (0..s.len())
            .step_by(2)
            .map(|i| u8::from_str_radix(&s[i..i + 2], 16).map_err(|e| e.to_string()))
            .collect()
    }

    pub fn encrypt(plain: &str) -> Result<String, String> {
        let data = plain.as_bytes();
        let in_blob = CRYPT_INTEGER_BLOB {
            cbData: data.len() as u32,
            pbData: data.as_ptr() as *mut u8,
        };
        let mut out = CRYPT_INTEGER_BLOB::default();
        unsafe {
            CryptProtectData(
                &in_blob,
                PCWSTR::null(),
                None,
                None,
                None,
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut out,
            )
            .map_err(|e| e.to_string())?;
            let bytes = std::slice::from_raw_parts(out.pbData, out.cbData as usize).to_vec();
            let _ = LocalFree(Some(HLOCAL(out.pbData as *mut core::ffi::c_void)));
            Ok(to_hex(&bytes))
        }
    }

    pub fn decrypt(hex: &str) -> Result<String, String> {
        let data = from_hex(hex)?;
        let in_blob = CRYPT_INTEGER_BLOB {
            cbData: data.len() as u32,
            pbData: data.as_ptr() as *mut u8,
        };
        let mut out = CRYPT_INTEGER_BLOB::default();
        unsafe {
            CryptUnprotectData(
                &in_blob,
                None,
                None,
                None,
                None,
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut out,
            )
            .map_err(|e| e.to_string())?;
            let bytes = std::slice::from_raw_parts(out.pbData, out.cbData as usize).to_vec();
            let _ = LocalFree(Some(HLOCAL(out.pbData as *mut core::ffi::c_void)));
            String::from_utf8(bytes).map_err(|e| e.to_string())
        }
    }
}

// Windows dışı (geliştirme) — düz geçiş (üretim Windows'tur)
#[cfg(not(windows))]
mod imp {
    pub fn encrypt(plain: &str) -> Result<String, String> {
        Ok(format!("plain:{plain}"))
    }
    pub fn decrypt(hex: &str) -> Result<String, String> {
        Ok(hex.strip_prefix("plain:").unwrap_or(hex).to_string())
    }
}

#[tauri::command]
pub fn encrypt_secret(plaintext: String) -> Result<String, String> {
    if plaintext.is_empty() {
        return Ok(String::new());
    }
    imp::encrypt(&plaintext)
}

#[tauri::command]
pub fn decrypt_secret(ciphertext: String) -> Result<String, String> {
    if ciphertext.is_empty() {
        return Ok(String::new());
    }
    imp::decrypt(&ciphertext)
}

#[cfg(test)]
mod tests {
    use super::imp;

    #[test]
    fn roundtrip() {
        let secret = "sk-ant-test-API-KEY-12345-çÇğĞ";
        let enc = imp::encrypt(secret).expect("encrypt");
        assert_ne!(enc, secret, "şifreli metin düz metinle aynı olmamalı");
        let dec = imp::decrypt(&enc).expect("decrypt");
        assert_eq!(dec, secret, "çözülen metin orijinalle eşleşmeli");
    }
}
