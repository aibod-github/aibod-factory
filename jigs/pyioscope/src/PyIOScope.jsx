import React, { useState, useCallback } from 'react';

const PyIOScope = () => {
  const [code, setCode] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [fileName, setFileName] = useState('');
  const [viewMode, setViewMode] = useState('table'); // table | flow | spec

  // I/Oパターン定義
  const ioPatterns = [
    // 標準open
    { 
      regex: /open\s*\(\s*(['"`])(.*?)\1\s*(?:,\s*(['"`])(\w+)\3)?\s*(?:,\s*encoding\s*=\s*(['"`])(\w+)\5)?\)/g,
      type: 'file',
      extract: (match) => ({
        file: match[2],
        mode: match[4] || 'r',
        encoding: match[6] || 'default',
        method: 'open()'
      })
    },
    // with open
    {
      regex: /with\s+open\s*\(\s*(['"`]?)([^'"`\n,]+)\1\s*(?:,\s*(['"`]?)(\w+)\3)?\s*(?:,\s*encoding\s*=\s*(['"`])(\w+)\5)?\s*\)/g,
      type: 'file',
      extract: (match) => ({
        file: match[2],
        mode: match[4] || 'r',
        encoding: match[6] || 'default',
        method: 'with open()'
      })
    },
    // 変数を使ったopen
    {
      regex: /open\s*\(\s*(\w+)\s*(?:,\s*(['"`])(\w+)\2)?\s*\)/g,
      type: 'file',
      extract: (match) => ({
        file: `{${match[1]}}`,
        mode: match[3] || 'r',
        encoding: 'default',
        method: 'open()',
        isVariable: true
      })
    },
    // pandas read_csv
    {
      regex: /pd\.read_csv\s*\(\s*(['"`]?)([^'"`\n,\)]+)\1/g,
      type: 'csv',
      extract: (match) => ({
        file: match[2],
        mode: 'r',
        method: 'pd.read_csv()',
        format: 'CSV'
      })
    },
    // pandas to_csv
    {
      regex: /\.to_csv\s*\(\s*(['"`]?)([^'"`\n,\)]+)\1/g,
      type: 'csv',
      extract: (match) => ({
        file: match[2],
        mode: 'w',
        method: 'df.to_csv()',
        format: 'CSV'
      })
    },
    // pandas read_json
    {
      regex: /pd\.read_json\s*\(\s*(['"`]?)([^'"`\n,\)]+)\1/g,
      type: 'json',
      extract: (match) => ({
        file: match[2],
        mode: 'r',
        method: 'pd.read_json()',
        format: 'JSON'
      })
    },
    // pandas to_json
    {
      regex: /\.to_json\s*\(\s*(['"`]?)([^'"`\n,\)]+)\1/g,
      type: 'json',
      extract: (match) => ({
        file: match[2],
        mode: 'w',
        method: 'df.to_json()',
        format: 'JSON'
      })
    },
    // pandas read_excel
    {
      regex: /pd\.read_excel\s*\(\s*(['"`]?)([^'"`\n,\)]+)\1/g,
      type: 'excel',
      extract: (match) => ({
        file: match[2],
        mode: 'r',
        method: 'pd.read_excel()',
        format: 'Excel'
      })
    },
    // pandas to_excel
    {
      regex: /\.to_excel\s*\(\s*(['"`]?)([^'"`\n,\)]+)\1/g,
      type: 'excel',
      extract: (match) => ({
        file: match[2],
        mode: 'w',
        method: 'df.to_excel()',
        format: 'Excel'
      })
    },
    // json.load
    {
      regex: /json\.load\s*\(\s*(\w+)\s*\)/g,
      type: 'json',
      extract: (match) => ({
        file: `{from ${match[1]}}`,
        mode: 'r',
        method: 'json.load()',
        format: 'JSON'
      })
    },
    // json.dump
    {
      regex: /json\.dump\s*\(\s*\w+\s*,\s*(\w+)/g,
      type: 'json',
      extract: (match) => ({
        file: `{to ${match[1]}}`,
        mode: 'w',
        method: 'json.dump()',
        format: 'JSON'
      })
    },
    // csv.reader
    {
      regex: /csv\.reader\s*\(\s*(\w+)/g,
      type: 'csv',
      extract: (match) => ({
        file: `{from ${match[1]}}`,
        mode: 'r',
        method: 'csv.reader()',
        format: 'CSV'
      })
    },
    // csv.writer
    {
      regex: /csv\.writer\s*\(\s*(\w+)/g,
      type: 'csv',
      extract: (match) => ({
        file: `{to ${match[1]}}`,
        mode: 'w',
        method: 'csv.writer()',
        format: 'CSV'
      })
    },
    // csv.DictReader
    {
      regex: /csv\.DictReader\s*\(\s*(\w+)/g,
      type: 'csv',
      extract: (match) => ({
        file: `{from ${match[1]}}`,
        mode: 'r',
        method: 'csv.DictReader()',
        format: 'CSV (Dict)'
      })
    },
    // csv.DictWriter
    {
      regex: /csv\.DictWriter\s*\(\s*(\w+)/g,
      type: 'csv',
      extract: (match) => ({
        file: `{to ${match[1]}}`,
        mode: 'w',
        method: 'csv.DictWriter()',
        format: 'CSV (Dict)'
      })
    },
    // pickle.load
    {
      regex: /pickle\.load\s*\(\s*(\w+)\s*\)/g,
      type: 'pickle',
      extract: (match) => ({
        file: `{from ${match[1]}}`,
        mode: 'rb',
        method: 'pickle.load()',
        format: 'Pickle'
      })
    },
    // pickle.dump
    {
      regex: /pickle\.dump\s*\(\s*\w+\s*,\s*(\w+)/g,
      type: 'pickle',
      extract: (match) => ({
        file: `{to ${match[1]}}`,
        mode: 'wb',
        method: 'pickle.dump()',
        format: 'Pickle'
      })
    },
    // yaml.safe_load
    {
      regex: /yaml\.(?:safe_)?load\s*\(\s*(\w+)/g,
      type: 'yaml',
      extract: (match) => ({
        file: `{from ${match[1]}}`,
        mode: 'r',
        method: 'yaml.load()',
        format: 'YAML'
      })
    },
    // yaml.dump
    {
      regex: /yaml\.(?:safe_)?dump\s*\(\s*\w+\s*,\s*(\w+)/g,
      type: 'yaml',
      extract: (match) => ({
        file: `{to ${match[1]}}`,
        mode: 'w',
        method: 'yaml.dump()',
        format: 'YAML'
      })
    },
    // sqlite3.connect
    {
      regex: /sqlite3\.connect\s*\(\s*(['"`])([^'"`\n]+)\1/g,
      type: 'database',
      extract: (match) => ({
        file: match[2],
        mode: 'rw',
        method: 'sqlite3.connect()',
        format: 'SQLite'
      })
    },
    // pathlib read_text
    {
      regex: /Path\s*\(\s*(['"`])([^'"`\n]+)\1\s*\)\.read_text\s*\(/g,
      type: 'file',
      extract: (match) => ({
        file: match[2],
        mode: 'r',
        method: 'Path.read_text()',
        format: 'Text'
      })
    },
    // pathlib write_text
    {
      regex: /Path\s*\(\s*(['"`])([^'"`\n]+)\1\s*\)\.write_text\s*\(/g,
      type: 'file',
      extract: (match) => ({
        file: match[2],
        mode: 'w',
        method: 'Path.write_text()',
        format: 'Text'
      })
    },
    // argparse引数
    {
      regex: /add_argument\s*\(\s*(['"`])(-{1,2}[^'"`]+)\1[^)]*type\s*=\s*(?:str|open|argparse\.FileType)/g,
      type: 'argument',
      extract: (match) => ({
        file: match[2],
        mode: 'arg',
        method: 'argparse',
        format: 'CLI引数'
      })
    },
    // sys.argv
    {
      regex: /sys\.argv\[(\d+)\]/g,
      type: 'argument',
      extract: (match) => ({
        file: `sys.argv[${match[1]}]`,
        mode: 'arg',
        method: 'sys.argv',
        format: 'CLI引数'
      })
    },
    // 環境変数
    {
      regex: /os\.(?:environ|getenv)\s*(?:\[|\.get\s*\(\s*)(['"`])([^'"`\n]+)\1/g,
      type: 'env',
      extract: (match) => ({
        file: `$${match[2]}`,
        mode: 'env',
        method: 'os.environ',
        format: '環境変数'
      })
    }
  ];

  // import文解析
  const analyzeImports = (code) => {
    const imports = [];
    const importRegex = /^(?:import|from)\s+(\w+)/gm;
    let match;
    while ((match = importRegex.exec(code)) !== null) {
      imports.push(match[1]);
    }
    return [...new Set(imports)];
  };

  // コード解析
  const analyzeCode = useCallback((code) => {
    const ios = [];
    const imports = analyzeImports(code);
    
    ioPatterns.forEach(pattern => {
      pattern.regex.lastIndex = 0;
      let match;
      while ((match = pattern.regex.exec(code)) !== null) {
        const extracted = pattern.extract(match);
        // 行番号を取得
        const lineNumber = code.substring(0, match.index).split('\n').length;
        ios.push({
          ...extracted,
          type: pattern.type,
          line: lineNumber,
          raw: match[0]
        });
      }
    });

    // モードから入出力方向を判定
    const categorized = ios.map(io => ({
      ...io,
      direction: getDirection(io.mode),
      format: io.format || guessFormat(io.file)
    }));

    // 重複除去（同じファイル・モード・行の組み合わせ）
    const unique = categorized.filter((io, idx, arr) => 
      arr.findIndex(x => x.file === io.file && x.mode === io.mode && x.line === io.line) === idx
    );

    return {
      ios: unique.sort((a, b) => a.line - b.line),
      imports,
      inputs: unique.filter(io => io.direction === 'input'),
      outputs: unique.filter(io => io.direction === 'output'),
      bidirectional: unique.filter(io => io.direction === 'bidirectional'),
      args: unique.filter(io => io.direction === 'argument'),
      env: unique.filter(io => io.direction === 'environment')
    };
  }, []);

  // モードから方向を判定
  const getDirection = (mode) => {
    if (mode === 'arg') return 'argument';
    if (mode === 'env') return 'environment';
    if (mode.includes('r') && mode.includes('w')) return 'bidirectional';
    if (mode.includes('w') || mode.includes('a') || mode.includes('+')) return 'output';
    return 'input';
  };

  // ファイル名から形式を推測
  const guessFormat = (filename) => {
    if (!filename) return 'Unknown';
    const lower = filename.toLowerCase();
    if (lower.includes('.csv')) return 'CSV';
    if (lower.includes('.json')) return 'JSON';
    if (lower.includes('.xlsx') || lower.includes('.xls')) return 'Excel';
    if (lower.includes('.yaml') || lower.includes('.yml')) return 'YAML';
    if (lower.includes('.txt')) return 'Text';
    if (lower.includes('.pkl') || lower.includes('.pickle')) return 'Pickle';
    if (lower.includes('.db') || lower.includes('.sqlite')) return 'SQLite';
    if (lower.includes('.xml')) return 'XML';
    if (lower.includes('.html')) return 'HTML';
    if (lower.includes('.log')) return 'Log';
    return 'File';
  };

  // ファイル処理
  const handleFile = (file) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setCode(text);
      setAnalysis(analyzeCode(text));
    };
    reader.readAsText(file);
  };

  // ドラッグ＆ドロップ
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // コード直接入力
  const handleCodeChange = (e) => {
    const newCode = e.target.value;
    setCode(newCode);
    if (newCode.trim()) {
      setAnalysis(analyzeCode(newCode));
    } else {
      setAnalysis(null);
    }
  };

  // 方向に応じたアイコンと色
  const getDirectionStyle = (direction) => {
    const styles = {
      input: { icon: '📥', color: 'bg-blue-100 text-blue-800', label: '入力' },
      output: { icon: '📤', color: 'bg-green-100 text-green-800', label: '出力' },
      bidirectional: { icon: '🔄', color: 'bg-purple-100 text-purple-800', label: '双方向' },
      argument: { icon: '⌨️', color: 'bg-orange-100 text-orange-800', label: '引数' },
      environment: { icon: '🔧', color: 'bg-gray-100 text-gray-800', label: '環境変数' }
    };
    return styles[direction] || styles.input;
  };

  // フォーマットに応じた色
  const getFormatStyle = (format) => {
    const styles = {
      'CSV': 'bg-emerald-100 text-emerald-800',
      'JSON': 'bg-yellow-100 text-yellow-800',
      'Excel': 'bg-green-100 text-green-800',
      'YAML': 'bg-red-100 text-red-800',
      'SQLite': 'bg-blue-100 text-blue-800',
      'Pickle': 'bg-pink-100 text-pink-800',
      'Text': 'bg-gray-100 text-gray-700',
      'CLI引数': 'bg-orange-100 text-orange-800',
      '環境変数': 'bg-slate-100 text-slate-800'
    };
    return styles[format] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-indigo-800 to-indigo-700 text-white p-4 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-400 text-indigo-900 px-2 py-1 rounded text-xs font-bold">
              治具
            </div>
            <h1 className="text-xl font-bold">PyIOScope</h1>
            <span className="text-indigo-200 text-sm">- Python I/O解析治具</span>
          </div>
          <p className="text-indigo-200 text-sm mt-1">
            Pythonスクリプトの入出力を自動解析 → 部品仕様書を生成
          </p>
        </div>

        <div className="flex gap-4">
          {/* 左：コード入力 */}
          <div className="flex-1 bg-white border border-t-0 border-slate-200">
            <div className="bg-slate-100 px-4 py-2 border-b flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">
                {fileName || 'Pythonコード入力'}
              </span>
              <label className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer">
                📂 ファイルを選択
                <input
                  type="file"
                  accept=".py"
                  className="hidden"
                  onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
                />
              </label>
            </div>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="relative"
            >
              <textarea
                value={code}
                onChange={handleCodeChange}
                placeholder="# Pythonコードをここに貼り付け、またはファイルをドロップ

import pandas as pd
import json

# 入力
df = pd.read_csv('input.csv')
with open('config.json', 'r') as f:
    config = json.load(f)

# 処理...

# 出力
df.to_csv('output.csv', index=False)
df.to_json('result.json')"
                className="w-full h-96 p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                spellCheck={false}
              />
            </div>
          </div>

          {/* 右：解析結果 */}
          <div className="w-96 bg-white border border-t-0 border-slate-200 rounded-br-lg">
            <div className="bg-slate-100 px-4 py-2 border-b">
              <div className="flex gap-2">
                {['table', 'flow', 'spec'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      viewMode === mode 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {mode === 'table' && '📋 一覧'}
                    {mode === 'flow' && '🔀 フロー'}
                    {mode === 'spec' && '📄 仕様書'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 h-96 overflow-y-auto">
              {!analysis ? (
                <div className="text-center text-slate-400 py-8">
                  <div className="text-4xl mb-2">🔍</div>
                  <p>コードを入力すると</p>
                  <p>I/Oを自動解析します</p>
                </div>
              ) : analysis.ios.length === 0 ? (
                <div className="text-center text-slate-400 py-8">
                  <div className="text-4xl mb-2">📭</div>
                  <p>I/O操作が検出されませんでした</p>
                </div>
              ) : (
                <>
                  {/* 一覧表示 */}
                  {viewMode === 'table' && (
                    <div className="space-y-2">
                      {/* サマリー */}
                      <div className="flex gap-2 mb-4 flex-wrap">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          📥 入力: {analysis.inputs.length}
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                          📤 出力: {analysis.outputs.length}
                        </span>
                        {analysis.args.length > 0 && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                            ⌨️ 引数: {analysis.args.length}
                          </span>
                        )}
                        {analysis.env.length > 0 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                            🔧 環境変数: {analysis.env.length}
                          </span>
                        )}
                      </div>

                      {/* I/Oリスト */}
                      {analysis.ios.map((io, idx) => {
                        const dirStyle = getDirectionStyle(io.direction);
                        return (
                          <div key={idx} className="p-3 bg-slate-50 rounded-lg border hover:border-indigo-300 transition-colors">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{dirStyle.icon}</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${dirStyle.color}`}>
                                {dirStyle.label}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs ${getFormatStyle(io.format)}`}>
                                {io.format}
                              </span>
                              <span className="text-xs text-slate-400 ml-auto">
                                L{io.line}
                              </span>
                            </div>
                            <div className="font-mono text-sm text-slate-800 truncate">
                              {io.file}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {io.method} / mode: {io.mode}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* フロー表示 */}
                  {viewMode === 'flow' && (
                    <div className="flex flex-col items-center gap-2">
                      {/* 入力 */}
                      {(analysis.inputs.length > 0 || analysis.args.length > 0 || analysis.env.length > 0) && (
                        <div className="w-full">
                          <div className="text-xs font-bold text-slate-500 mb-2 text-center">📥 INPUT</div>
                          <div className="space-y-1">
                            {[...analysis.inputs, ...analysis.args, ...analysis.env].map((io, idx) => (
                              <div key={idx} className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                                <span className={`px-1.5 py-0.5 rounded text-xs ${getFormatStyle(io.format)}`}>
                                  {io.format}
                                </span>
                                <span className="font-mono text-xs truncate flex-1">{io.file}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 矢印 */}
                      <div className="text-2xl text-slate-300">↓</div>

                      {/* 処理ボックス */}
                      <div className="w-full p-4 bg-indigo-100 rounded-lg border-2 border-indigo-300 text-center">
                        <div className="text-lg mb-1">⚙️</div>
                        <div className="font-bold text-indigo-800">
                          {fileName || 'script.py'}
                        </div>
                        <div className="text-xs text-indigo-600 mt-1">
                          imports: {analysis.imports.slice(0, 5).join(', ')}
                          {analysis.imports.length > 5 && '...'}
                        </div>
                      </div>

                      {/* 矢印 */}
                      <div className="text-2xl text-slate-300">↓</div>

                      {/* 出力 */}
                      {analysis.outputs.length > 0 && (
                        <div className="w-full">
                          <div className="text-xs font-bold text-slate-500 mb-2 text-center">📤 OUTPUT</div>
                          <div className="space-y-1">
                            {analysis.outputs.map((io, idx) => (
                              <div key={idx} className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                                <span className={`px-1.5 py-0.5 rounded text-xs ${getFormatStyle(io.format)}`}>
                                  {io.format}
                                </span>
                                <span className="font-mono text-xs truncate flex-1">{io.file}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 仕様書表示 */}
                  {viewMode === 'spec' && (
                    <div className="font-mono text-xs bg-slate-900 text-slate-100 p-4 rounded-lg">
                      <div className="text-green-400 mb-2"># 部品仕様書 (自動生成)</div>
                      <div className="text-slate-400 mb-4"># Generated by PyIOScope</div>
                      
                      <div className="text-yellow-400">name:</div>
                      <div className="ml-4 mb-2">{fileName || 'untitled.py'}</div>
                      
                      <div className="text-yellow-400">imports:</div>
                      <div className="ml-4 mb-2">
                        {analysis.imports.map((imp, i) => (
                          <div key={i}>- {imp}</div>
                        ))}
                      </div>
                      
                      <div className="text-yellow-400">inputs:</div>
                      <div className="ml-4 mb-2">
                        {analysis.inputs.length === 0 ? (
                          <div className="text-slate-500">[]</div>
                        ) : analysis.inputs.map((io, i) => (
                          <div key={i}>
                            - file: {io.file}
                            <div className="ml-4">format: {io.format}</div>
                            <div className="ml-4">method: {io.method}</div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="text-yellow-400">outputs:</div>
                      <div className="ml-4 mb-2">
                        {analysis.outputs.length === 0 ? (
                          <div className="text-slate-500">[]</div>
                        ) : analysis.outputs.map((io, i) => (
                          <div key={i}>
                            - file: {io.file}
                            <div className="ml-4">format: {io.format}</div>
                            <div className="ml-4">method: {io.method}</div>
                          </div>
                        ))}
                      </div>

                      {analysis.args.length > 0 && (
                        <>
                          <div className="text-yellow-400">arguments:</div>
                          <div className="ml-4 mb-2">
                            {analysis.args.map((io, i) => (
                              <div key={i}>- {io.file}</div>
                            ))}
                          </div>
                        </>
                      )}

                      {analysis.env.length > 0 && (
                        <>
                          <div className="text-yellow-400">environment:</div>
                          <div className="ml-4 mb-2">
                            {analysis.env.map((io, i) => (
                              <div key={i}>- {io.file}</div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="mt-4 text-center text-xs text-slate-400">
          AIBOD Factory 治具システム - PyIOScope v0.1
        </div>
      </div>
    </div>
  );
};

export default PyIOScope;
