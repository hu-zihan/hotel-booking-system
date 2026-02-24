// 根据星级计算默认评分
export const getDefaultScore = (star: number): number => {
  const scoreMap: Record<number, number> = {
    5: 4.8,
    4: 4.5,
    3: 4.0,
    2: 3.5,
    1: 3.0,
  };
  return scoreMap[star] || 4.0;
};

// 根据评分获取评级文字
export const getScoreLevel = (score: number): string => {
  return score >= 4.8 ? '超棒' : score >= 4.5 ? '好评' : score >= 4.0 ? '不错' : '尚可';
};

// 根据评分获取徽章样式类名
export const getScoreBadgeClass = (score: number): string => {
  return score >= 4.8 ? 'score-orange' : score >= 4.5 ? 'score-blue' : score >= 4.0 ? 'score-green' : 'score-gray';
};
