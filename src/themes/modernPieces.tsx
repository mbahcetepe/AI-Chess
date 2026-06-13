import type { JSX, CSSProperties } from "react";
import type { PieceRenderObject } from "react-chessboard";

/**
 * Modern tema taşları: düz (flat), minimalist, geometrik silüetler.
 * 45x45 viewBox — react-chessboard'un varsayılan taşlarıyla aynı koordinat sistemi.
 */

interface Palette {
  fill: string;
  stroke: string;
  detail: string;
}

const WHITE: Palette = { fill: "#f8fafc", stroke: "#46556a", detail: "#46556a" };
const BLACK: Palette = { fill: "#2b3648", stroke: "#141c28", detail: "#a7b8cc" };

type PieceProps = { svgStyle?: CSSProperties } | undefined;

function svgWrap(children: JSX.Element, props: PieceProps): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 45 45"
      width="100%"
      height="100%"
      style={props?.svgStyle}
    >
      {children}
    </svg>
  );
}

function groupStyle(c: Palette): CSSProperties {
  return {
    fill: c.fill,
    stroke: c.stroke,
    strokeWidth: 1.4,
    strokeLinejoin: "round",
    strokeLinecap: "round",
  } as CSSProperties;
}

const pawn = (c: Palette) => (props: PieceProps) =>
  svgWrap(
    <g style={groupStyle(c)}>
      <circle cx="22.5" cy="13" r="5.6" />
      <path d="M 20,17.5 L 25,17.5 L 26,27 L 19,27 Z" />
      <path d="M 14,37 L 31,37 C 31,30.5 27.5,27 22.5,27 C 17.5,27 14,30.5 14,37 Z" />
    </g>,
    props,
  );

const rook = (c: Palette) => (props: PieceProps) =>
  svgWrap(
    <g style={groupStyle(c)}>
      <path d="M 14,9 L 18,9 L 18,12 L 21,12 L 21,9 L 24,9 L 24,12 L 27,12 L 27,9 L 31,9 L 31,16 L 14,16 Z" />
      <path d="M 16.5,16 L 28.5,16 L 28,31 L 17,31 Z" />
      <path d="M 13,37 L 32,37 L 32,35 L 30,33 L 15,33 L 13,35 Z" />
    </g>,
    props,
  );

const knight = (c: Palette) => (props: PieceProps) =>
  svgWrap(
    <g style={groupStyle(c)}>
      <path d="M 24.5,10.5 L 21.5,12.5 L 19.5,9 L 17.8,14.2 C 13.8,17.2 11.8,22 12,26.5 L 17,27.5 C 17.3,25 18.5,23.3 20.3,22.3 L 20.9,25 C 16.5,28.3 14.5,32 14.5,37 L 31.5,37 C 31.5,28 29.8,17.8 24.5,13 Z" />
      <circle cx="21.3" cy="15.6" r="1" style={{ fill: c.detail, stroke: "none" }} />
    </g>,
    props,
  );

const bishop = (c: Palette) => (props: PieceProps) =>
  svgWrap(
    <g style={groupStyle(c)}>
      <circle cx="22.5" cy="8.5" r="2.3" />
      <path d="M 22.5,12 C 26.8,16.2 29,20.5 29,25 C 29,30 26.2,33 22.5,33 C 18.8,33 16,30 16,25 C 16,20.5 18.2,16.2 22.5,12 Z" />
      <path
        d="M 22.5,18 L 22.5,26 M 18.8,22 L 26.2,22"
        style={{ stroke: c.detail, strokeWidth: 1.6, fill: "none" }}
      />
      <path d="M 14.5,37 L 30.5,37 L 30.5,35.3 C 28,34 25.8,33.6 22.5,33.6 C 19.2,33.6 17,34 14.5,35.3 Z" />
    </g>,
    props,
  );

const queen = (c: Palette) => (props: PieceProps) =>
  svgWrap(
    <g style={groupStyle(c)}>
      <circle cx="13.8" cy="12" r="2.1" />
      <circle cx="22.5" cy="8.8" r="2.1" />
      <circle cx="31.2" cy="12" r="2.1" />
      <path d="M 12.5,32 L 32.5,32 L 30.3,15.8 L 26.2,24.5 L 22.5,12.8 L 18.8,24.5 L 14.7,15.8 Z" />
      <path d="M 13,37 L 32,37 L 32,34.3 L 13,34.3 Z" />
    </g>,
    props,
  );

const king = (c: Palette) => (props: PieceProps) =>
  svgWrap(
    <g style={groupStyle(c)}>
      <path d="M 21.2,5.5 L 23.8,5.5 L 23.8,8.7 L 27,8.7 L 27,11.3 L 23.8,11.3 L 23.8,14.5 L 21.2,14.5 L 21.2,11.3 L 18,11.3 L 18,8.7 L 21.2,8.7 Z" />
      <path d="M 16.8,16 L 28.2,16 L 28.2,18.5 L 16.8,18.5 Z" />
      <path d="M 17.2,18.5 L 27.8,18.5 L 29.8,33.5 L 15.2,33.5 Z" />
      <path d="M 13.5,37 L 31.5,37 L 31.5,34.3 L 13.5,34.3 Z" />
    </g>,
    props,
  );

export const modernPieces: PieceRenderObject = {
  wP: pawn(WHITE),
  wR: rook(WHITE),
  wN: knight(WHITE),
  wB: bishop(WHITE),
  wQ: queen(WHITE),
  wK: king(WHITE),
  bP: pawn(BLACK),
  bR: rook(BLACK),
  bN: knight(BLACK),
  bB: bishop(BLACK),
  bQ: queen(BLACK),
  bK: king(BLACK),
};
