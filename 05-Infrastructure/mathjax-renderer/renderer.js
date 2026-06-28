// MathJax LaTeX -> SVG 子进程服务
// 协议：Java 端通过 stdin 写入一行 JSON 请求，本进程通过 stdout 返回一行 JSON 响应
// 请求格式：{"id":"<唯一标识>","latex":"<LaTeX源码>","display":true|false}
// 响应格式：{"id":"<同上>","svg":"<svg字符串>","error":null} 或 {"id":"...","svg":null,"error":"<错误信息>"}
// 特殊请求：{"id":"__shutdown__"} 表示优雅退出

const mjpage = require('mathjax-node');
mjpage.start();

const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });

// MathJax 初始化标志，首次请求会触发，需等待
let mjReady = false;
mjpage.typeset({
  math: '',
  format: 'TeX',
  svg: true,
}, () => { mjReady = true; });

rl.on('line', (line) => {
  let req;
  try {
    req = JSON.parse(line);
  } catch (e) {
    // 解析失败直接跳过，不响应（避免协议错乱）
    process.stderr.write('Invalid JSON: ' + line + '\n');
    return;
  }

  if (req.id === '__shutdown__') {
    process.exit(0);
  }

  const render = () => {
    mjpage.typeset({
      math: req.latex,
      format: 'TeX',          // 接收 TeX 输入
      svg: true,              // 输出 SVG
      speakText: false,
      // display=true 用 \displaystyle 块级公式，false 用行内
      state: { displayMode: !!req.display },
    }, (data) => {
      let resp;
      if (data.errors) {
        resp = { id: req.id, svg: null, error: data.errors.join('; ') };
      } else {
        // data.svg 包含 <svg ...>...</svg>
        resp = { id: req.id, svg: data.svg || '', error: null };
      }
      process.stdout.write(JSON.stringify(resp) + '\n');
    });
  };

  // 等 MathJax 首次初始化完成
  if (mjReady) {
    render();
  } else {
    const wait = () => {
      if (mjReady) render();
      else setTimeout(wait, 50);
    };
    wait();
  }
});

// 启动信号
process.stdout.write('{"id":"__ready__","svg":null,"error":null}\n');
