/**
 * exam/mimic/generate.js
 * Client-side mimic question generator for school exam pages.
 *
 * Public API:
 *   generateMimicQuestion({ examKey, paper, qId, templateMode })
 *     → Promise<{ question_text, options, answer, figure_svg } | null>
 *
 *   generateFigureSVG(qId, overrides)
 *     → string (SVG markup)
 *
 *   loadExamTemplates(examKey, paper)
 *     → Promise<Array<template>>
 */

(function (global) {
    'use strict';

    var _scriptSrc = (typeof document !== 'undefined' && document.currentScript)
        ? document.currentScript.src
        : '';
    var _scriptBase = _scriptSrc.replace(/[^/]*$/, '');
    var TEMPLATES_URL = _scriptBase + 'auto_templates_exam.json';

    var _cachedTemplates = null;

    async function loadAllTemplates() {
        if (_cachedTemplates) return _cachedTemplates;
        try {
            var resp = await fetch(TEMPLATES_URL);
            if (!resp.ok) throw new Error('fetch failed');
            _cachedTemplates = await resp.json();
        } catch (e) {
            _cachedTemplates = {};
        }
        return _cachedTemplates;
    }

    async function loadExamTemplates(examKey, paper) {
        var all = await loadAllTemplates();
        var prefix = examKey + '-' + paper + '-';
        return Object.values(all).filter(function(t) { return t.id && t.id.startsWith(prefix); });
    }

    async function findTemplate(examKey, paper, qId) {
        var all = await loadAllTemplates();
        var bySource = Object.values(all).find(
            function(t) { return t.source_question_id === qId && t.examKey === examKey && t.paper === paper; }
        );
        if (bySource) return bySource;

        var qMatch = qId.match(/Q(\d+)$/i);
        if (qMatch) {
            var num = parseInt(qMatch[1], 10);
            var idKey = examKey + '-' + paper + '-q' + String(num).padStart(2, '0');
            if (all[idKey]) return all[idKey];
        }
        return null;
    }

    function substituteVars(text, varValues) {
        return text.replace(/\{([a-zA-Z_]\w*)\}/g, function(match, name) {
            return varValues.hasOwnProperty(name) ? varValues[name] : match;
        });
    }

    function pickVarValues(varSpecs) {
        var result = {};
        for (var name in varSpecs) {
            if (!varSpecs.hasOwnProperty(name)) continue;
            var spec = varSpecs[name];
            var min = spec.min, max = spec.max, step = spec.step || 1;
            var steps = Math.round((max - min) / step);
            var chosen = min + Math.round(Math.random() * steps) * step;
            result[name] = parseFloat(chosen.toFixed(10)).toString();
        }
        return result;
    }

    function generateFromTemplate(template) {
        var varValues = pickVarValues(template.var_specs || {});
        var question_text = substituteVars(template.template_text || '', varValues);
        var answer = template.answer_template
            ? substituteVars(template.answer_template, varValues)
            : null;
        var options = template.options_template
            ? generateOptionsFromTemplate(template.options_template, varValues)
            : null;
        return { question_text: question_text, options: options, answer: answer };
    }

    function generateOptionsFromTemplate(optTemplate, varValues) {
        var result = {};
        for (var key in optTemplate) {
            if (!optTemplate.hasOwnProperty(key)) continue;
            result[key] = substituteVars(optTemplate[key], varValues);
        }
        return result;
    }

    async function generateMimicQuestion(params) {
        var examKey = params.examKey, paper = params.paper, qId = params.qId;
        var template = await findTemplate(examKey, paper, qId);
        if (!template) return null;
        var result = generateFromTemplate(template);
        // Attach SVG figure if this is a geometry question
        var qNum = parseInt(qId.replace(/\D/g, ''), 10) || 0;
        if (qNum >= 5 && qNum <= 40) {
            result.figure_svg = generateFigureSVG(qId, result._varValues || {});
        }
        return result;
    }

    // ============================================================
    // SVG Figure Generator for Geometry Questions
    // ============================================================

    function rand(min, max) {
        return min + Math.floor(Math.random() * (max - min + 1));
    }

    var _figureTypeMap = {
        5: 'area-polygon', 6: 'volume-prism',
        12: 'stem-leaf', 13: 'stem-leaf',
        18: 'coordinate-point', 20: 'coordinate-translation',
        22: 'triangle-angles', 23: 'parallel-lines-alt',
        24: 'parallel-lines-int', 25: 'triangle-angles',
        26: 'triangle-congruent', 27: 'triangle-congruent',
        28: 'triangle-congruent',
        30: 'parallelogram-shaded',
        33: 'pie-chart',
        34: 'stem-leaf',
        37: 'shaded-circle-rect',
        38: 'parallel-lines-ext',
        39: 'parallel-lines-int',
        40: 'triangle-congruent'
    };

    function getFigureType(qNum) {
        return _figureTypeMap[qNum] || null;
    }

    function getDefaultParams(type) {
        var params = {};
        var r = function(min, max) { return rand(min, max); };
        switch(type) {
            case 'parallel-lines-int':
                params = { a1: r(40,70), a2: r(30,60) }; break;
            case 'parallel-lines-ext':
                params = { a1: r(50,80), a2: r(30,60) }; break;
            case 'parallel-lines-alt':
                params = { a1: r(40,70) }; break;
            case 'triangle-angles':
                params = { a: r(30,60), b: r(30,60) }; break;
            case 'triangle-congruent':
                params = {}; break;
            case 'coordinate-point':
                params = { px: r(50,200), py: r(50,200), x: r(-5,5), y: r(-5,5) }; break;
            case 'coordinate-translation':
                params = { px: r(50,200), py: r(100,180), x: r(-5,5), y: r(-5,5), u: r(2,5) }; break;
            case 'area-polygon':
                params = { w: r(4,8), h: r(3,6) }; break;
            case 'volume-prism':
                params = { l: r(4,8), w: r(3,6), h: r(2,5) }; break;
            case 'parallelogram-shaded':
                params = { base: r(6,12), height: r(3,6), offset: r(20,40) }; break;
            case 'shaded-circle-rect':
                params = { rw: r(8,14), rh: r(5,10), r: r(2,4) }; break;
            case 'stem-leaf':
                params = {
                    stems: [2,3,4,5,6],
                    leaves: [[r(1,9),r(1,9)],[r(1,9),r(1,9),r(1,9)],[r(1,9),r(1,9),r(1,9),r(1,9)],[r(1,9),r(1,9)],[r(1,9),r(1,9),r(1,9)]]
                }; break;
            case 'pie-chart':
                var t1 = r(15,35), t2 = r(15,35), t3 = r(10,25), t4 = 100 - t1 - t2 - t3;
                params = { sectors: [[t1,'A'],[t2,'B'],[t3,'C'],[Math.max(5,t4),'D']] }; break;
            default:
                params = {};
        }
        return params;
    }

    function generateFigureSVG(qId, overrides) {
        var qNum = parseInt(qId.replace(/\D/g, ''), 10) || 0;
        var type = getFigureType(qNum);
        if (!type) return null;
        var params = Object.assign({}, getDefaultParams(type), overrides || {});
        return renderFigure(type, params);
    }

    function renderFigure(type, p) {
        switch(type) {
            case 'parallel-lines-int': return renderParallelLinesInt(p);
            case 'parallel-lines-ext': return renderParallelLinesExt(p);
            case 'parallel-lines-alt': return renderParallelLinesAlt(p);
            case 'triangle-angles': return renderTriangleAngles(p);
            case 'triangle-congruent': return renderTriangleCongruent(p);
            case 'coordinate-point': return renderCoordinatePoint(p);
            case 'coordinate-translation': return renderCoordinateTrans(p);
            case 'area-polygon': return renderAreaPolygon(p);
            case 'volume-prism': return renderVolumePrism(p);
            case 'parallelogram-shaded': return renderParallelogram(p);
            case 'shaded-circle-rect': return renderShadedCircle(p);
            case 'pie-chart': return renderPieChart(p);
            case 'stem-leaf': return renderStemLeaf(p);
            default: return null;
        }
    }

    function svgTag(w, h, content) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" style="display:block;margin:10px auto;">' + content + '</svg>';
    }

    function renderParallelLinesInt(p) {
        var a1 = p.a1||50, a2 = p.a2||40;
        var c = '<line x1="20" y1="40" x2="280" y2="40" stroke="black" stroke-width="2"/>';
        c += '<line x1="20" y1="140" x2="280" y2="140" stroke="black" stroke-width="2"/>';
        c += '<line x1="100" y1="10" x2="80" y2="170" stroke="black" stroke-width="1.5"/>';
        c += '<text x="285" y="44" font-size="11">AB // CD</text>';
        c += '<circle cx="95" cy="45" r="13" fill="none" stroke="#c0392b" stroke-width="1.5"/>';
        c += '<text x="84" y="49" font-size="11" fill="#c0392b">'+a1+'°</text>';
        c += '<circle cx="80" cy="135" r="13" fill="none" stroke="#27ae60" stroke-width="1.5"/>';
        c += '<text x="69" y="139" font-size="11" fill="#27ae60">'+a2+'°</text>';
        c += '<circle cx="115" cy="45" r="13" fill="none" stroke="#8e44ad" stroke-width="1.5"/>';
        c += '<text x="108" y="49" font-size="11" fill="#8e44ad">x</text>';
        return svgTag(300, 180, c);
    }

    function renderParallelLinesExt(p) {
        var a1 = p.a1||60, a2 = p.a2||40;
        var c = '<line x1="20" y1="40" x2="280" y2="40" stroke="black" stroke-width="2"/>';
        c += '<line x1="20" y1="140" x2="280" y2="140" stroke="black" stroke-width="2"/>';
        c += '<line x1="200" y1="10" x2="220" y2="170" stroke="black" stroke-width="1.5"/>';
        c += '<text x="285" y="44" font-size="11">AB // CD</text>';
        c += '<circle cx="210" cy="50" r="15" fill="none" stroke="#c0392b" stroke-width="1.5"/>';
        c += '<text x="200" y="55" font-size="11" fill="#c0392b">'+a1+'°</text>';
        c += '<circle cx="230" cy="50" r="15" fill="none" stroke="#8e44ad" stroke-width="1.5"/>';
        c += '<text x="223" y="55" font-size="11" fill="#8e44ad">x</text>';
        c += '<circle cx="245" cy="155" r="13" fill="none" stroke="#27ae60" stroke-width="1.5"/>';
        c += '<text x="238" y="159" font-size="11" fill="#27ae60">'+a2+'°</text>';
        return svgTag(300, 180, c);
    }

    function renderParallelLinesAlt(p) {
        var a1 = p.a1||50;
        var c = '<line x1="20" y1="40" x2="280" y2="40" stroke="black" stroke-width="2"/>';
        c += '<line x1="20" y1="140" x2="280" y2="140" stroke="black" stroke-width="2"/>';
        c += '<line x1="80" y1="10" x2="60" y2="170" stroke="black" stroke-width="1.5"/>';
        c += '<text x="285" y="44" font-size="11">AB // CD</text>';
        c += '<circle cx="95" cy="45" r="13" fill="none" stroke="#c0392b" stroke-width="1.5"/>';
        c += '<text x="88" y="49" font-size="11" fill="#c0392b">'+a1+'°</text>';
        c += '<circle cx="60" cy="135" r="13" fill="none" stroke="#8e44ad" stroke-width="1.5"/>';
        c += '<text x="53" y="139" font-size="11" fill="#8e44ad">x</text>';
        return svgTag(300, 180, c);
    }

    function renderTriangleAngles(p) {
        var a = p.a||50, b = p.b||60;
        var c = '<polygon points="30,150 140,25 250,150" fill="none" stroke="black" stroke-width="2"/>';
        c += '<circle cx="90" cy="135" r="14" fill="none" stroke="#2980b9" stroke-width="1.5"/>';
        c += '<text x="81" y="140" font-size="11" fill="#2980b9">'+a+'°</text>';
        c += '<circle cx="140" cy="40" r="14" fill="none" stroke="#2980b9" stroke-width="1.5"/>';
        c += '<text x="133" y="45" font-size="11" fill="#2980b9">'+b+'°</text>';
        c += '<circle cx="210" cy="135" r="14" fill="none" stroke="#8e44ad" stroke-width="1.5"/>';
        c += '<text x="203" y="140" font-size="11" fill="#8e44ad">x</text>';
        c += '<text x="55" y="95" font-size="10">A</text>';
        c += '<text x="133" y="20" font-size="10">B</text>';
        c += '<text x="235" y="150" font-size="10">C</text>';
        return svgTag(280, 180, c);
    }

    function renderTriangleCongruent(p) {
        var c = '<polygon points="20,130 100,20 180,130" fill="none" stroke="black" stroke-width="2"/>';
        c += '<text x="55" y="80" font-size="10">A</text><text x="90" y="20" font-size="10">B</text><text x="165" y="145" font-size="10">C</text>';
        c += '<polygon points="200,130 270,20 340,130" fill="none" stroke="#2980b9" stroke-width="2"/>';
        c += '<text x="225" y="80" font-size="10">D</text><text x="260" y="20" font-size="10">E</text><text x="325" y="145" font-size="10">F</text>';
        c += '<text x="70" y="118" font-size="9" fill="#c0392b">//</text>';
        c += '<text x="110" y="118" font-size="9" fill="#c0392b">//</text>';
        c += '<text x="240" y="118" font-size="9" fill="#c0392b">//</text>';
        c += '<text x="260" y="118" font-size="9" fill="#c0392b">//</text>';
        c += '<circle cx="270" cy="70" r="15" fill="none" stroke="#8e44ad" stroke-width="1.5"/>';
        c += '<text x="263" y="75" font-size="11" fill="#8e44ad">x</text>';
        return svgTag(360, 160, c);
    }

    function renderCoordinatePoint(p) {
        var px = p.px||150, py = p.py||100, x = p.x||2, y = p.y||-3;
        var c = gridSVG() + gridPoints(px, py, null, null, x, y);
        return svgTag(260, 260, c);
    }

    function renderCoordinateTrans(p) {
        var px = p.px||150, py = p.py||130, x = p.x||2, y = p.y||-3, u = p.u||3;
        var c = gridSVG();
        c += '<circle cx="'+px+'" cy="'+py+'" r="5" fill="#2980b9"/>';
        c += '<text x="'+(px-5)+'" y="'+(py-10)+'" font-size="11" fill="#2980b9">P('+x+','+y+')</text>';
        c += '<circle cx="'+(px+u*30)+'" cy="'+py+'" r="5" fill="#c0392b"/>';
        c += '<text x="'+(px+u*30+8)+'" y="'+(py+4)+'" font-size="11" fill="#c0392b">P\'</text>';
        c += '<line x1="'+px+'" y1="'+py+'" x2="'+(px+u*30)+'" y2="'+py+'" stroke="#27ae60" stroke-width="1" stroke-dasharray="4,2"/>';
        c += '<text x="'+(px+u*15)+'" y="'+(py-8)+'" font-size="10" fill="#27ae60">'+u+'單位</text>';
        return svgTag(260, 260, c);
    }

    function gridSVG() {
        var c = '<line x1="20" y1="230" x2="240" y2="230" stroke="black" stroke-width="1.5"/>';
        c += '<line x1="30" y1="10" x2="30" y2="240" stroke="black" stroke-width="1.5"/>';
        for (var i = 1; i <= 7; i++) {
            c += '<line x1="30" y1="'+(230-i*30)+'" x2="230" y2="'+(230-i*30)+'" stroke="#e0e0e0" stroke-width="0.5"/>';
            c += '<line x1="'+(30+i*30)+'" y1="230" x2="'+(30+i*30)+'" y2="30" stroke="#e0e0e0" stroke-width="0.5"/>';
        }
        c += '<text x="238" y="222" font-size="13">x</text><text x="35" y="18" font-size="13">y</text>';
        c += '<text x="12" y="245" font-size="10">O</text>';
        return c;
    }

    function gridPoints(px, py, px2, py2, x, y) {
        var c = '<circle cx="'+px+'" cy="'+py+'" r="6" fill="#c0392b"/>';
        c += '<text x="'+(px+8)+'" y="'+(py-8)+'" font-size="12" fill="#c0392b">('+x+','+y+')</text>';
        return c;
    }

    function renderAreaPolygon(p) {
        var w = p.w||6, h = p.h||4;
        var c = '<rect x="50" y="50" width="'+(w*20)+'" height="'+(h*20)+'" fill="#f0f0f0" stroke="black" stroke-width="2"/>';
        c += '<text x="'+(50+w*10-10)+'" y="40" font-size="11" text-anchor="middle">'+w+' cm</text>';
        c += '<text x="30" y="'+(50+h*10+4)+'" font-size="11">'+h+' cm</text>';
        return svgTag(300, 200, c);
    }

    function renderVolumePrism(p) {
        var l = p.l||6, w = p.w||4, h = p.h||3;
        var c = '<text x="5" y="110" font-size="10">底：'+l+'×'+w+' cm²</text>';
        c += '<text x="5" y="125" font-size="10">高：'+h+' cm</text>';
        c += '<text x="5" y="145" font-size="12" fill="#8e44ad">V = '+l*w*h+' cm³</text>';
        return svgTag(200, 160, c);
    }

    function renderParallelogram(p) {
        var b = p.base||8, h = p.height||4, off = p.offset||30;
        var c = '<rect x="30" y="30" width="260" height="140" fill="none" stroke="black" stroke-width="1"/>';
        c += '<polygon points="'+(30+off)+',30,'+(270)+',30,240,170,'+off+',170" fill="#e8e8e8" stroke="black" stroke-width="2"/>';
        c += '<text x="130" y="20" font-size="11" text-anchor="middle">'+b+' cm</text>';
        c += '<text x="280" y="105" font-size="11">'+h+' cm</text>';
        c += '<text x="110" y="110" font-size="12" fill="#8e44ad" font-weight="bold">陰影 = ?</text>';
        return svgTag(320, 200, c);
    }

    function renderShadedCircle(p) {
        var rw = p.rw||12, rh = p.rh||8, r = p.r||3;
        var c = '<rect x="30" y="30" width="'+(rw*10)+'" height="'+(rh*10)+'" fill="none" stroke="black" stroke-width="2"/>';
        c += '<circle cx="'+(30+rw*5)+'" cy="'+(30+rh*5)+'" r="'+(r*10)+'" fill="#ddd" stroke="black" stroke-width="1.5"/>';
        c += '<text x="'+(30+(rw*10)+5)+'" y="'+(30+(rh*10)/2+4)+'" font-size="11">'+rw+' cm</text>';
        c += '<text x="30" y="20" font-size="11">'+rh+' cm</text>';
        c += '<text x="'+(30+rw*5-5)+'" y="'+(30+rh*5+4)+'" font-size="10" fill="#c0392b">r='+r+' cm</text>';
        return svgTag(320, 200, c);
    }

    function renderPieChart(p) {
        var sectors = p.sectors || [[25,'A'],[25,'B'],[25,'C'],[25,'D']];
        var cx = 100, cy = 100, r = 80;
        var colors = ['#3498db','#e74c3c','#2ecc71','#f39c12','#9b59b6'];
        var c = '';
        var startAngle = 0;
        sectors.forEach(function(sec, i) {
            var angle = sec[0] * 3.6;
            var endAngle = startAngle + angle;
            var x1 = cx + r * Math.cos(Math.PI * startAngle / 180);
            var y1 = cy + r * Math.sin(Math.PI * startAngle / 180);
            var x2 = cx + r * Math.cos(Math.PI * endAngle / 180);
            var y2 = cy + r * Math.sin(Math.PI * endAngle / 180);
            var largeArc = angle > 180 ? 1 : 0;
            c += '<path d="M ' + cx + ' ' + cy + ' L ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' A ' + r + ' ' + r + ' 0 ' + largeArc + ' 1 ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + ' Z" fill="' + colors[i % colors.length] + '" stroke="white" stroke-width="1"/>';
            var midAngle = startAngle + angle / 2;
            var mx = cx + r / 2 * Math.cos(Math.PI * midAngle / 180);
            var my = cy + r / 2 * Math.sin(Math.PI * midAngle / 180);
            c += '<text x="' + (mx - 5) + '" y="' + (my + 4) + '" font-size="11" fill="white" font-weight="bold">' + sec[0] + '%</text>';
            startAngle = endAngle;
        });
        return svgTag(220, 220, c);
    }

    function renderStemLeaf(p) {
        var stems = p.stems || [2,3,4,5,6];
        var leaves = p.leaves || [[5,8],[2,4,7],[1,3,5,9],[2,6],[1,4,7]];
        var c = '<text x="5" y="30" font-size="12" font-weight="bold" fill="#333">莖</text>';
        c += '<text x="60" y="30" font-size="12" font-weight="bold" fill="#333">葉</text>';
        stems.forEach(function(stem, i) {
            var y = 50 + i * 22;
            c += '<text x="15" y="'+y+'" font-size="12" font-weight="bold">' + stem + '</text>';
            c += '<text x="60" y="'+y+'" font-size="12">' + leaves[i].join('  ') + '</text>';
            c += '<line x1="45" y1="'+y+'" x2="45" y2="'+y+'" stroke="black" stroke-width="1"/>';
        });
        c += '<text x="5" y="180" font-size="11" fill="#888">單位：分鐘</text>';
        return svgTag(300, 200, c);
    }

    // ============================================================
    // Exports
    // ============================================================

    global.examMimic = {
        generateMimicQuestion: generateMimicQuestion,
        generateFigureSVG: generateFigureSVG,
        loadExamTemplates: loadExamTemplates,
        loadAllTemplates: loadAllTemplates,
        generateFromTemplate: generateFromTemplate,
        substituteVars: substituteVars,
        pickVarValues: pickVarValues,
        // Internal helpers (for teacher page)
        _getFigureType: getFigureType,
        _getDefaultParams: getDefaultParams,
        _renderFigure: renderFigure
    };

}(typeof window !== 'undefined' ? window : this));
