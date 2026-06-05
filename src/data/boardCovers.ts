import boardCover1 from '../assets/board/b1.webp';
import boardCover2 from '../assets/board/b2.webp';
import boardCover3 from '../assets/board/b3.webp';
import boardCover4 from '../assets/board/b4.webp';
import boardCover5 from '../assets/board/b5.webp';
import boardCover6 from '../assets/board/b6.webp';
import boardCover7 from '../assets/board/b7.webp';
import boardCover9 from '../assets/board/b9.webp';
import boardCover28 from '../assets/board/b28.webp';

const boardCoverImages: Record<string, string> = {
  车协工作区: boardCover1,
  行者足音: boardCover2,
  车友宝典: boardCover3,
  纯净水: boardCover4,
  考察与社会: boardCover5,
  五湖四海: boardCover6,
  一技之长: boardCover7,
  竞技竞赛: boardCover9,
  竞赛竞技: boardCover9,
  网站维护: boardCover28,
};

export function getBoardCoverImage(boardName: string) {
  return boardCoverImages[boardName];
}
