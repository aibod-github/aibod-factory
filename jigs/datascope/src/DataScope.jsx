import React, { useState, useCallback } from 'react';

const DataScope = () => {
  const [data, setData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('structure');

  // データ型を推定
  const inferType = (value) => {
    if (value === null || value === undefined || value === '') return 'empty';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'float';
    if (typeof value === 'object') return Array.isArray(value) ? 'array' : 'object';
    if (typeof value === 'string') {
      if (!isNaN(value) && value.trim() !== '') {
        return value.includes('.') ? 'float(string)' : 'integer(string)';
      }
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
      if (/^[\w.-]+@[\w.-]+\.\w+$/.test(value)) return 'email';
      return 'string';
    }
    return 'unknown';
  };

  // カラム統計を計算
  const calculateStats = (values) => {
    const nonEmpty = values.filter(v => v !== null && v !== undefined && v !== '');
    const types = values.map(inferType);
    const typeCount = types.reduce((acc, t) => ({ ...acc, [t]: (acc[t] || 0) + 1 }), {});
    const dominantType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
    
    const stats = {
      total: values.length,
      empty: values.length - nonEmpty.length,
      emptyRate: ((values.length - nonEmpty.length) / values.length * 100).toFixed(1),
      unique: new Set(nonEmpty.map(String)).size,
      dominantType,
      typeDistribution: typeCount,
      samples: nonEmpty.slice(0, 3)
    };

    // 数値統計
    const numbers = nonEmpty.map(v => parseFloat(v)).filter(n => !isNaN(n));
    if (numbers.length > 0) {
      stats.min = Math.min(...numbers);
      stats.max = Math.max(...numbers);
      stats.avg = (numbers.reduce((a, b) => a + b, 0) / numbers.length).toFixed(2);
      if (numbers.length > 1) {
        const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        const variance = numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length;
        stats.std = Math.sqrt(variance).toFixed(2);
      }
    }

    // 文字列統計
    const strings = nonEmpty.filter(v => typeof v === 'string' || typeof v === 'number').map(String);
    if (strings.length > 0) {
      const lengths = strings.map(s => s.length);
      stats.minLen = Math.min(...lengths);
      stats.maxLen = Math.max(...lengths);
    }

    return stats;
  };

  // CSVパース
  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 1) throw new Error('空のファイルです');
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      return headers.reduce((obj, h, i) => ({ ...obj, [h]: values[i] }), {});
    });
    
    return { headers, rows, type: 'csv' };
  };

  // JSONパース（ネスト構造解析）
  const analyzeJSON = (obj, path = '') => {
    const result = [];
    
    if (Array.isArray(obj)) {
      if (obj.length > 0 && typeof obj[0] === 'object') {
        return analyzeJSON(obj[0], path + '[]');
      }
      result.push({ path: path + '[]', type: inferType(obj[0]), isArray: true });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        const newPath = path ? `${path}.${key}` : key;
        if (typeof value === 'object' && value !== null) {
          result.push(...analyzeJSON(value, newPath));
        } else {
          result.push({ path: newPath, type: inferType(value), sample: value });
        }
      });
    }
    
    return result;
  };

  // ファイル処理
  const handleFile = useCallback((file) => {
    setError('');
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        
        if (file.name.endsWith('.json')) {
          const json = JSON.parse(text);
          const isArray = Array.isArray(json);
          const rows = isArray ? json : [json];
          const structure = analyzeJSON(isArray ? json[0] : json);
          const headers = structure.map(s => s.path);
          
          // フラット化してカラム値を抽出
          const flattenObject = (obj, prefix = '') => {
            return Object.entries(obj).reduce((acc, [key, value]) => {
              const newKey = prefix ? `${prefix}.${key}` : key;
              if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                return { ...acc, ...flattenObject(value, newKey) };
              }
              return { ...acc, [newKey]: value };
            }, {});
          };
          
          const flatRows = rows.map(r => flattenObject(r));
          
          setData({ headers, rows: flatRows, structure, type: 'json', rawRows: rows });
          setFileType('JSON');
        } else {
          const parsed = parseCSV(text);
          setData(parsed);
          setFileType('CSV');
        }
      } catch (err) {
        setError(`解析エラー: ${err.message}`);
        setData(null);
      }
    };
    reader.readAsText(file);
  }, []);

  // ドラッグ＆ドロップ
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = (e) => e.preventDefault();

  // 型に応じた色
  const getTypeColor = (type) => {
    const colors = {
      'integer': 'bg-blue-100 text-blue-800',
      'float': 'bg-cyan-100 text-cyan-800',
      'integer(string)': 'bg-blue-50 text-blue-600',
      'float(string)': 'bg-cyan-50 text-cyan-600',
      'string': 'bg-green-100 text-green-800',
      'date': 'bg-purple-100 text-purple-800',
      'boolean': 'bg-orange-100 text-orange-800',
      'email': 'bg-pink-100 text-pink-800',
      'array': 'bg-yellow-100 text-yellow-800',
      'object': 'bg-gray-100 text-gray-800',
      'empty': 'bg-red-100 text-red-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  // 品質ゲージ（Go/No-Go風）
  const QualityGauge = ({ value, threshold = 10, label }) => {
    const isGood = value <= threshold;
    return (
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${isGood ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm">{label}: {value}%</span>
        <span className={`text-xs ${isGood ? 'text-green-600' : 'text-red-600'}`}>
          {isGood ? 'GO' : 'NG'}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-4 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-400 text-slate-800 px-2 py-1 rounded text-xs font-bold">
              治具
            </div>
            <h1 className="text-xl font-bold">DataScope</h1>
            <span className="text-slate-300 text-sm">- データI/O可視化治具</span>
          </div>
          <p className="text-slate-300 text-sm mt-1">
            CSV/JSONの構造・品質を一目で確認
          </p>
        </div>

        {/* ドロップエリア */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="bg-white border-2 border-dashed border-slate-300 p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
          onClick={() => document.getElementById('fileInput').click()}
        >
          <input
            id="fileInput"
            type="file"
            accept=".csv,.json"
            className="hidden"
            onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
          />
          <div className="text-4xl mb-2">📂</div>
          <p className="text-slate-600">CSV / JSON ファイルをドロップ</p>
          <p className="text-slate-400 text-sm">またはクリックして選択</p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 border-l-4 border-red-500">
            {error}
          </div>
        )}

        {data && (
          <div className="bg-white border border-t-0 border-slate-200 rounded-b-lg">
            {/* ファイル情報バー */}
            <div className="bg-slate-100 px-4 py-2 flex items-center gap-4 border-b">
              <span className="font-mono text-sm bg-white px-2 py-1 rounded border">
                {fileName}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-bold ${
                fileType === 'JSON' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'
              }`}>
                {fileType}
              </span>
              <span className="text-slate-600 text-sm">
                {data.rows.length} レコード / {data.headers.length} カラム
              </span>
            </div>

            {/* タブ */}
            <div className="flex border-b">
              {[
                { id: 'structure', label: '📐 構造', desc: '寸法確認' },
                { id: 'quality', label: '✓ 品質', desc: '検査成績' },
                { id: 'preview', label: '👁 プレビュー', desc: '現物確認' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                  <span className="text-xs text-slate-400 ml-1">({tab.desc})</span>
                </button>
              ))}
            </div>

            {/* コンテンツ */}
            <div className="p-4">
              {/* 構造タブ */}
              {activeTab === 'structure' && (
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">構造図</span>
                    カラム/キー定義
                  </h3>
                  <div className="grid gap-2">
                    {data.headers.map((header, idx) => {
                      const values = data.rows.map(r => r[header]);
                      const stats = calculateStats(values);
                      return (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border hover:border-blue-300 transition-colors">
                          <div className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center text-xs font-mono text-slate-600">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-mono font-medium text-slate-800">{header}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(stats.dominantType)}`}>
                                {stats.dominantType}
                              </span>
                              <span className="text-xs text-slate-500">
                                {stats.unique} 種類
                              </span>
                              {stats.minLen !== undefined && (
                                <span className="text-xs text-slate-400">
                                  長さ: {stats.minLen}-{stats.maxLen}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right text-xs text-slate-500">
                            例: <span className="font-mono bg-white px-1 rounded">{String(stats.samples[0] ?? '-').slice(0, 20)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 品質タブ */}
              {activeTab === 'quality' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">検査成績</span>
                    データ品質レポート
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="text-left p-2 font-medium">カラム</th>
                          <th className="text-left p-2 font-medium">型</th>
                          <th className="text-right p-2 font-medium">空率</th>
                          <th className="text-right p-2 font-medium">ユニーク</th>
                          <th className="text-right p-2 font-medium">最小</th>
                          <th className="text-right p-2 font-medium">最大</th>
                          <th className="text-right p-2 font-medium">平均</th>
                          <th className="text-center p-2 font-medium">判定</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.headers.map((header, idx) => {
                          const values = data.rows.map(r => r[header]);
                          const stats = calculateStats(values);
                          const isGood = parseFloat(stats.emptyRate) <= 10;
                          return (
                            <tr key={idx} className="border-b hover:bg-slate-50">
                              <td className="p-2 font-mono">{header}</td>
                              <td className="p-2">
                                <span className={`px-2 py-0.5 rounded text-xs ${getTypeColor(stats.dominantType)}`}>
                                  {stats.dominantType}
                                </span>
                              </td>
                              <td className={`p-2 text-right ${parseFloat(stats.emptyRate) > 10 ? 'text-red-600 font-bold' : ''}`}>
                                {stats.emptyRate}%
                              </td>
                              <td className="p-2 text-right">{stats.unique}</td>
                              <td className="p-2 text-right font-mono">{stats.min ?? '-'}</td>
                              <td className="p-2 text-right font-mono">{stats.max ?? '-'}</td>
                              <td className="p-2 text-right font-mono">{stats.avg ?? '-'}</td>
                              <td className="p-2 text-center">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                  isGood ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {isGood ? 'GO' : 'NG'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600">
                    <strong>判定基準:</strong> 空率10%以下 = GO（良品）
                  </div>
                </div>
              )}

              {/* プレビュータブ */}
              {activeTab === 'preview' && (
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs">現物確認</span>
                    先頭10件プレビュー
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-700 text-white">
                          <th className="p-2 text-left font-medium">#</th>
                          {data.headers.map((h, i) => (
                            <th key={i} className="p-2 text-left font-medium font-mono">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.rows.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="p-2 text-slate-400">{idx + 1}</td>
                            {data.headers.map((h, i) => (
                              <td key={i} className="p-2 font-mono text-xs max-w-xs truncate">
                                {row[h] === null || row[h] === undefined || row[h] === '' 
                                  ? <span className="text-red-400 italic">NULL</span>
                                  : String(row[h]).slice(0, 50)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* フッター */}
        <div className="mt-4 text-center text-xs text-slate-400">
          AIBOD Factory 治具システム - DataScope v0.1
        </div>
      </div>
    </div>
  );
};

export default DataScope;
