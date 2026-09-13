/** Original rounded storybook monsters; bosses carry distinct silhouettes. */
import * as THREE from 'three';
import type { MonsterId } from '../config/EnemyConfig';
import { makeSlimeTexture, OUTLINE } from './SpriteFactory';
import { makeBatTexture, makeMushroomTexture } from './StageSprites';

export function makeEnemyTexture(id: MonsterId): THREE.CanvasTexture {
  if (id === 'slime') return makeSlimeTexture(false);
  if (id === 'bat') return makeBatTexture();
  if (id === 'mushroom') return makeMushroomTexture();
  const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
  const c = canvas.getContext('2d')!;
  c.lineJoin = 'round'; c.lineCap = 'round';
  const oval = (x: number, y: number, rx: number, ry: number, color: string, stroke = true): void => {
    c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
    if (stroke) { c.strokeStyle = OUTLINE; c.lineWidth = 3; c.stroke(); }
  };
  const box = (x: number, y: number, w: number, h: number, color: string, radius = 4): void => {
    c.fillStyle = color; c.beginPath(); c.roundRect(x, y, w, h, radius); c.fill();
    c.strokeStyle = OUTLINE; c.lineWidth = 3; c.stroke();
  };
  const poly = (points: number[][], color: string): void => {
    c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
    c.fillStyle = color; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 3; c.stroke();
  };
  const eyes = (y: number, color = '#333348'): void => {
    oval(53, y, 4, 6, color, false); oval(74, y, 4, 6, color, false);
    oval(52, y - 2, 1.5, 2, '#fff', false); oval(73, y - 2, 1.5, 2, '#fff', false);
    c.strokeStyle = color; c.lineWidth = 2; c.beginPath(); c.arc(64, y + 9, 5, .1, Math.PI - .1); c.stroke();
  };
  const crown = (y: number, color = '#e2bd66'): void => poly([[39, y + 13], [36, y - 5], [50, y + 1], [63, y - 12], [76, y + 1], [91, y - 5], [86, y + 13]], color);
  const gem = (x: number, y: number, color: string): void => poly([[x, y - 9], [x + 7, y], [x, y + 10], [x - 7, y]], color);

  if (id === 'trainingDummy') {
    box(57, 41, 13, 77, '#78573b'); box(17, 62, 94, 10, '#a78054');
    box(40, 62, 48, 39, '#cba778', 9); oval(64, 37, 24, 24, '#d8b888');
    eyes(34); c.strokeStyle = '#976f4b'; c.lineWidth = 3;
    c.beginPath(); c.arc(64, 82, 12, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(64, 82, 5, 0, Math.PI * 2); c.stroke();
    box(39, 115, 50, 7, '#62472f');
  } else if (id === 'giantSlime') {
    oval(64, 88, 55, 32, '#77c78d'); oval(62, 75, 48, 40, '#95dc9d');
    oval(45, 53, 18, 7, '#caffcf', false); eyes(77); crown(36, '#a8d8ed');
    oval(36, 89, 8, 4, '#eab9b8', false); oval(91, 89, 8, 4, '#eab9b8', false);
  } else if (id === 'fang' || id === 'bloodFang' || id === 'emberBeast') {
    const ember = id === 'emberBeast'; const boss = id !== 'fang';
    const fur = ember ? '#cc734a' : boss ? '#995967' : '#b6867c';
    poly([[25, 98], [10, 82], [6, 54], [33, 69]], fur);
    oval(68, 89, 41, 26, fur); box(37, 101, 20, 16, '#625363'); box(83, 101, 20, 16, '#625363');
    poly([[33, 44], [28, 13], [54, 32]], fur); poly([[74, 30], [99, 12], [99, 51]], fur);
    oval(64, 60, 39, 31, fur); oval(65, 75, 26, 14, '#efd4ba'); eyes(56);
    oval(65, 69, 7, 5, '#433748', false);
    poly([[48, 79], [53, 90], [57, 79]], '#fff9df'); poly([[73, 79], [77, 90], [82, 79]], '#fff9df');
    if (boss) {
      for (const [x, y] of [[34, 41], [47, 32], [65, 27], [83, 33], [97, 44]]) gem(x, y, ember ? '#ffc766' : '#e7859d');
      if (ember) { poly([[30, 99], [25, 72], [40, 82], [47, 61], [57, 96]], '#edac50'); gem(65, 48, '#ffe8a5'); }
    }
  } else if (id === 'ghost' || id === 'mage' || id === 'phantomScholar' || id === 'flame' || id === 'abyssLord') {
    const flame = id === 'flame'; const lord = id === 'abyssLord'; const scholar = id === 'phantomScholar';
    const color = flame ? '#efac62' : lord ? '#655594' : scholar ? '#91a6d5' : id === 'ghost' ? '#b4e4dd' : '#8293c3';
    poly([[33, 59], [94, 59], [112, 113], [88, 107], [75, 121], [59, 110], [39, 120], [18, 109]], color);
    oval(64, 50, 33, 32, color); oval(64, 54, 24, 20, flame ? '#ffdd8b' : '#e5ebf1'); eyes(51);
    oval(24, 78, 10, 13, color); oval(103, 78, 10, 13, color);
    if (flame) { poly([[32, 39], [39, 10], [55, 28], [71, 6], [90, 43]], '#f5bc67'); }
    if (id === 'mage' || scholar) {
      poly([[23, 35], [64, 3], [102, 34]], '#566789'); box(24, 33, 78, 9, '#b5c5e7');
      box(11, 89, 44, 23, '#e1cfac'); box(34, 89, 20, 23, '#f4e8ce');
      if (scholar) { oval(54, 54, 9, 9, '#ffffff22'); oval(75, 54, 9, 9, '#ffffff22'); crown(17, '#cddbf4'); }
    }
    if (lord) {
      poly([[31, 36], [17, 4], [43, 23]], '#9ac6df'); poly([[96, 36], [111, 4], [84, 23]], '#9ac6df');
      crown(22, '#b5c8e5'); gem(64, 87, '#8fe8eb');
      poly([[22, 65], [6, 96], [34, 111]], '#453b69'); poly([[106, 65], [122, 96], [94, 111]], '#453b69');
    }
  } else {
    const skeleton = id === 'skeleton' || id === 'boneCaptain';
    const captain = id === 'boneCaptain'; const king = id === 'fallenKing'; const guardian = id === 'abyssGuardian';
    const metal = guardian ? '#90b5cd' : king ? '#91a6c7' : id === 'ironWarden' ? '#8096a4' : '#81929d';
    box(39, 91, 15, 28, skeleton ? '#e4d8bd' : metal); box(75, 91, 15, 28, skeleton ? '#e4d8bd' : metal);
    box(34, 61, 61, 38, skeleton ? '#e8dcc4' : metal, 12);
    oval(64, 38, 30, 29, skeleton ? '#eee4cd' : '#bdcbd2');
    eyes(36); box(21, 67, 14, 30, skeleton ? '#e8dcc4' : metal, 6);
    box(95, 63, 14, 30, skeleton ? '#e8dcc4' : metal, 6);
    if (skeleton) {
      for (const y of [70, 79, 88]) { box(44, y, 38, 4, '#b6a991', 2); }
      for (const x of [55, 64, 73]) box(x, 54, 5, 7, '#e4d8bd', 1);
    } else {
      box(26, 54, 22, 18, metal, 8); box(81, 54, 24, 20, metal, 8);
      box(35, 20, 58, 20, metal, 9); gem(64, 79, guardian ? '#b5ffff' : '#e5c885');
      poly([[8, 74], [34, 68], [41, 90], [25, 114], [9, 99]], metal);
      c.strokeStyle = '#dce5ec'; c.lineWidth = 3; c.beginPath(); c.moveTo(22, 77); c.lineTo(25, 103); c.stroke();
    }
    if (captain) { box(32, 12, 64, 17, '#8da4bf', 8); poly([[54, 14], [67, 2], [83, 14]], '#d0b977'); }
    if (king) { crown(16); poly([[32, 60], [13, 112], [36, 117]], '#76567e'); }
    if (guardian) { gem(34, 26, '#cffaff'); gem(94, 26, '#cffaff'); }
    if (captain || king || id === 'ironWarden') { box(109, 29, 6, 72, '#c0cfda', 2); box(99, 85, 23, 6, '#d4bb73', 2); }
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter; texture.generateMipmaps = false;
  return texture;
}
