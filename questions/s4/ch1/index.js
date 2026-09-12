const CONTENT = {
  expand: {
    mode: "expand",
    templateId: "quadratic.expand",
    title: "展開及化簡",
    topicLabel: "展開為一般式",
    instruction: "請將方程展開並化簡為最簡一般式：",
    steps: [
      { label: "請輸入完整的最簡一般式方程：", hint: "例如：x^2+3x-10=0 或 2x^2-5x+3=0" }
    ],
    challengeEligible: true,
    worksheetEligible: true,
    parameterRanges: {
      basic: "p,q ∈ {-6..-1,1..6}; k ∈ {-9..9}",
      advanced: "三種展開結構；非零整數係數及常數"
    }
  },
  sqrt: {
    mode: "sqrt",
    templateId: "quadratic.square-root",
    title: "平方根法求根",
    topicLabel: "平方根法",
    instruction: "利用平方根法求解：",
    steps: [
      { label: "步驟 1：兩邊同時取平方根：", hint: "例如：x+2=+-4" },
      { label: "步驟 2：輸入兩個方程根：", hint: "" }
    ],
    challengeEligible: true,
    worksheetEligible: true,
    parameterRanges: {
      basic: "平移量 p ∈ {-6..-1,1..6}; k 為 2² 至 8² 的完全平方",
      advanced: "平移量 p ∈ {-6..-1,1..6}; k ∈ {8,12,18,20,24,27,32,40,48,50}"
    }
  },
  factor: {
    mode: "factor",
    templateId: "quadratic.factorisation",
    title: "因式分解法求根",
    topicLabel: "因式分解法",
    instruction: "先因式分解，再利用零乘積性質求根：",
    steps: [
      { label: "步驟 1：輸入兩一次因式相乘：", hint: "例如：(x-3)(2x+1)=0" },
      { label: "步驟 2：輸入兩個方程根：", hint: "" }
    ],
    challengeEligible: true,
    worksheetEligible: true,
    parameterRanges: {
      basic: "兩個一次因式的首項係數為 1",
      advanced: "第一個首項係數為 2 或 3，並排除可約公因數情況"
    }
  },
  formula: {
    mode: "formula",
    templateId: "quadratic.quadratic-formula",
    title: "二次公式法求根",
    topicLabel: "二次公式法",
    instruction: "先計算判別式，再代入二次公式：",
    steps: [
      { label: "步驟 1：輸入判別式 Δ：", hint: "例如：36 或 -16" },
      { label: "步驟 2：輸入兩個方程根：", hint: "" }
    ],
    challengeEligible: true,
    worksheetEligible: true,
    parameterRanges: {
      basic: "a ∈ {1,2,3}; b ∈ {-7..-1,1..7}; c ∈ {-8..-1,1..8}; Δ ≥ 0",
      advanced: "實根或複數根；精確分數、根式及複數表示"
    }
  },
  calculator: {
    mode: "calculator",
    templateId: "quadratic.calculator",
    title: "計算機法實戰",
    topicLabel: "計算機法",
    instruction: "用計算機模式求根，先確認判別式：",
    steps: [
      { label: "步驟 1：輸入判別式 Δ：", hint: "例如：25 或 -11" },
      { label: "步驟 2：輸入計算機顯示的結果：", hint: "" }
    ],
    challengeEligible: true,
    worksheetEligible: true,
    parameterRanges: {
      basic: "a ∈ {1..4}; b ∈ {-8..-1,1..8}; c ∈ {-10..10}",
      advanced: "a ∈ {2..9}; b ∈ {-15..-1,1..15}; c ∈ {-25..25}; Δ 正負皆有"
    }
  }
};

const MODES = ["expand", "sqrt", "factor", "formula", "calculator"];

module.exports = {
  course: "s4",
  chapter: "ch1",
  id: "s4-ch1-quadratic-equations",
  title: "一元二次方程練習",
  modes: MODES,
  content: CONTENT
};
