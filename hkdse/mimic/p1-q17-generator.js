(function (root) {
    'use strict';

    const ORIGINAL_BASES = [2, 5, 10];
    const REFERENCE_BASES = [2, 3, 5, 7];
    const REFERENCE_MULTIPLIERS = [2, 3, 4];
    const POSITIVE_DIFFERENCES = [6, 8, 9, 10, 12, 15];
    const NEGATIVE_DIFFERENCES = [-6, -8, -9, -10, -12, -15];

    function randomInt(min, max, rng) {
        return Math.floor(rng() * (max - min + 1)) + min;
    }

    function pick(items, rng) {
        return items[randomInt(0, items.length - 1, rng)];
    }

    function formatNumber(value) {
        return Number(value).toLocaleString('en-US');
    }

    function signed(value) {
        return value < 0 ? `- ${formatNumber(Math.abs(value))}` : `+ ${formatNumber(value)}`;
    }

    function compactSigned(value) {
        return value < 0 ? `-${Math.abs(value)}` : `${value}`;
    }

    function arithmeticSum(firstTerm, difference, n) {
        return n * (2 * firstTerm + (n - 1) * difference) / 2;
    }

    function linearTerm(coefficient, constant) {
        const coefficientText = coefficient === 1 ? 'n' : coefficient === -1 ? '-n' : `${coefficient}n`;
        if (constant === 0) return coefficientText;
        return `${coefficientText} ${signed(constant)}`;
    }

    function inequalityText(operator, value) {
        return `${operator} ${formatNumber(value)}`;
    }

    function createOriginalQuestion(rng) {
        const coefficient = pick([3, 4, 5, 6], rng);
        const constant = randomInt(coefficient + 1, coefficient + 8, rng);
        const base = pick(ORIGINAL_BASES, rng);
        const target = randomInt(24, 60, rng);
        const firstTerm = coefficient - constant;
        const targetSum = arithmeticSum(firstTerm, coefficient, target);
        const nextSum = arithmeticSum(firstTerm, coefficient, target + 1);
        const generalTerm = linearTerm(coefficient, -constant);

        return {
            mode: 'original',
            modeLabel: '2015 原題式',
            sourceLabel: 'HKDSE 2015 卷一第 17 題結構',
            signature: `original-${coefficient}-${constant}-${base}-${target}`,
            params: {
                coefficient,
                constant,
                base,
                target,
                firstTerm,
                targetSum,
                nextSum
            },
            questionHtml: String.raw`
                <p>對任意正整數 \(n\)，設 \(A(n)=${generalTerm}\) 及 \(B(n)=${base}^{${generalTerm}}\)。</p>
                <p><strong>(a)</strong> 以 \(n\) 表示 \(A(1)+A(2)+A(3)+\cdots+A(n)\)。<span class="mark">（2 分）</span></p>
                <p><strong>(b)</strong> 求 \(n\) 的最大值，使得</p>
                <div class="display-equation">\[
                    \log_{${base}}\bigl(B(1)B(2)B(3)\cdots B(n)\bigr) ${inequalityText('≤', targetSum)}。
                \]</div>
                <span class="mark">（3 分）</span>
            `,
            answerAHtml: String.raw`
                <p>數列 \(A(1),A(2),\ldots,A(n)\) 的首項為 \(${firstTerm}\)，公差為 \(${coefficient}\)。</p>
                <p>因此，</p>
                <div class="equation">\[
                    \begin{aligned}
                    A(1)+\cdots+A(n)
                    &=\frac{n}{2}\bigl[2(${firstTerm})+(${coefficient})(n-1)\bigr]\\
                    &=\frac{n\bigl(${coefficient}n ${signed(coefficient - 2 * constant)}\bigr)}{2}.
                    \end{aligned}
                \]</div>
                <p class="answer-line">(a) \(\boxed{\dfrac{n\bigl(${coefficient}n ${signed(coefficient - 2 * constant)}\bigr)}{2}}\)</p>
            `,
            answerBHtml: String.raw`
                <p>由 \(B(i)=${base}^{A(i)}\)，</p>
                <div class="equation">\[
                    \begin{aligned}
                    \log_{${base}}\bigl(B(1)\cdots B(n)\bigr)
                    &=A(1)+\cdots+A(n)\\
                    &=\frac{n\bigl(${coefficient}n ${signed(coefficient - 2 * constant)}\bigr)}{2}.
                    \end{aligned}
                \]</div>
                <p>當 \(n=${target}\) 時，左式為 \(${formatNumber(targetSum)}\)；當 \(n=${target + 1}\) 時，左式為 \(${formatNumber(nextSum)}\)。</p>
                <p>因為 \(${formatNumber(targetSum)}\leq${formatNumber(targetSum)}\)，而 \(${formatNumber(nextSum)}>${formatNumber(targetSum)}\)，所以最大值為</p>
                <p class="answer-line">(b) \(\boxed{n=${target}}\)</p>
            `,
            answerSummary: {
                partA: `n(${coefficient}n ${signed(coefficient - 2 * constant)})/2`,
                partB: target
            }
        };
    }

    function findReferenceQuestion(rng) {
        for (let attempt = 0; attempt < 200; attempt += 1) {
            const difference = pick(rng() < 0.5 ? POSITIVE_DIFFERENCES : NEGATIVE_DIFFERENCES, rng);
            const firstTerm = randomInt(2, 14, rng);
            const firstIndex = randomInt(3, 6, rng);
            const indexGap = randomInt(6, 8, rng);
            const secondIndex = firstIndex + indexGap;
            const logBase = pick(REFERENCE_BASES, rng);
            const logMultiplier = pick(REFERENCE_MULTIPLIERS, rng);
            const productBase = Math.pow(logBase, logMultiplier);
            const target = randomInt(18, 32, rng);
            const targetSum = arithmeticSum(firstTerm, difference, target);
            const nextSum = arithmeticSum(firstTerm, difference, target + 1);
            const currentValue = targetSum / logMultiplier;
            const nextValue = nextSum / logMultiplier;

            if (difference > 0) {
                const limit = Math.floor(currentValue) + 1;
                if (limit > currentValue && limit <= nextValue) {
                    return buildReferenceQuestion({
                        difference,
                        firstTerm,
                        firstIndex,
                        secondIndex,
                        logBase,
                        logMultiplier,
                        productBase,
                        target,
                        targetSum,
                        nextSum,
                        operator: '<',
                        threshold: limit
                    });
                }
            } else if (currentValue < 0 && nextValue < currentValue) {
                const threshold = Math.ceil(nextValue);
                if (nextValue <= threshold && threshold < currentValue) {
                    return buildReferenceQuestion({
                        difference,
                        firstTerm,
                        firstIndex,
                        secondIndex,
                        logBase,
                        logMultiplier,
                        productBase,
                        target,
                        targetSum,
                        nextSum,
                        operator: '>',
                        threshold
                    });
                }
            }
        }

        return buildReferenceQuestion({
            difference: -10,
            firstTerm: 7,
            firstIndex: 5,
            secondIndex: 12,
            logBase: 5,
            logMultiplier: 3,
            productBase: 125,
            target: 24,
            targetSum: arithmeticSum(7, -10, 24),
            nextSum: arithmeticSum(7, -10, 25),
            operator: '>',
            threshold: -925
        });
    }

    function buildReferenceQuestion(data) {
        const {
            difference,
            firstTerm,
            firstIndex,
            secondIndex,
            logBase,
            logMultiplier,
            productBase,
            target,
            targetSum,
            nextSum,
            operator,
            threshold
        } = data;
        const firstGiven = firstTerm + (firstIndex - 1) * difference;
        const secondGiven = firstTerm + (secondIndex - 1) * difference;
        const intercept = firstTerm - difference;
        const generalTerm = linearTerm(difference, intercept);
        const thresholdText = formatNumber(threshold);
        const currentValue = targetSum / logMultiplier;
        const nextValue = nextSum / logMultiplier;
        const boundaryOperator = operator === '<' ? '>=' : '<=';

        return {
            mode: 'reference',
            modeLabel: 'GeoGebra 參考式',
            sourceLabel: '參考 GeoGebra HKDSE Math P1 仿題格式',
            signature: `reference-${difference}-${firstTerm}-${firstIndex}-${secondIndex}-${logBase}-${logMultiplier}-${target}-${operator}`,
            params: {
                difference,
                firstTerm,
                firstIndex,
                secondIndex,
                firstGiven,
                secondGiven,
                intercept,
                logBase,
                logMultiplier,
                productBase,
                target,
                targetSum,
                nextSum,
                operator,
                threshold,
                currentValue,
                nextValue
            },
            questionHtml: String.raw`
                <p>設 \(A(n)\) 為一等差數列的第 \(n\) 項。已知 \(A(${firstIndex})=${compactSigned(firstGiven)}\) 及 \(A(${secondIndex})=${compactSigned(secondGiven)}\)。</p>
                <p><strong>(a)</strong> 求 \(A(n)\)。<span class="mark">（2 分）</span></p>
                <p><strong>(b)</strong> 假定對任何正整數 \(n\)，\(\log_{${logBase}}G(n)=A(n)\)。求 \(k\) 的最大值，使得</p>
                <div class="display-equation">\[
                    \log_{${productBase}}\bigl(G(1)G(2)G(3)\cdots G(k)\bigr) ${operator} ${thresholdText}。
                \]</div>
                <span class="mark">（5 分）</span>
            `,
            answerAHtml: String.raw`
                <p>公差為</p>
                <div class="equation">\[
                    d=\frac{A(${secondIndex})-A(${firstIndex})}{${secondIndex}-${firstIndex}}
                    =\frac{${compactSigned(secondGiven)}-(${compactSigned(firstGiven)})}{${secondIndex - firstIndex}}
                    =${compactSigned(difference)}.
                \]</div>
                <p>所以</p>
                <div class="equation">\[
                    \begin{aligned}
                    A(n)&=A(${firstIndex})+(${compactSigned(difference)})(n-${firstIndex})\\
                    &=${generalTerm}.
                    \end{aligned}
                \]</div>
                <p class="answer-line">(a) \(\boxed{A(n)=${generalTerm}}\)</p>
            `,
            answerBHtml: String.raw`
                <p>令 \(S_k=A(1)+A(2)+\cdots+A(k)\)。由對數的運算規則，</p>
                <div class="equation">\[
                    \begin{aligned}
                    S_k&=\frac{k}{2}\bigl[2(${compactSigned(firstTerm)})+(${compactSigned(difference)})(k-1)\bigr]\\
                    &=\frac{k\bigl(${difference}k ${signed(2 * firstTerm - difference)}\bigr)}{2},\\
                    \log_{${productBase}}\bigl(G(1)\cdots G(k)\bigr)&=\frac{S_k}{${logMultiplier}}.
                    \end{aligned}
                \]</div>
                <p>當 \(k=${target}\) 時，左式為 \(${formatNumber(currentValue)}\)；當 \(k=${target + 1}\) 時，左式為 \(${formatNumber(nextValue)}\)。</p>
                <p>因此，\(k=${target}\) 仍然符合不等式，而 \(k=${target + 1}\) 不符合（下一個整數的邊界為 \(${boundaryOperator}\ ${thresholdText}\)）。</p>
                <p class="answer-line">(b) \(\boxed{k=${target}}\)</p>
            `,
            answerSummary: {
                partA: `A(n)=${generalTerm}`,
                partB: target
            }
        };
    }

    function generate(mode, rng) {
        const random = typeof rng === 'function' ? rng : Math.random;
        return mode === 'reference' ? findReferenceQuestion(random) : createOriginalQuestion(random);
    }

    const api = {
        generate,
        createOriginalQuestion,
        findReferenceQuestion,
        arithmeticSum,
        formatNumber
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root) root.P1Q17Generator = api;
}(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this)));
