export const DIAPER_TABLE_COLUMNS = [
  { key: 'name', label: '名前', width: 150, fixed: true, left: 0, zIndex: 3 },
  { key: 'room_number', label: '部屋番号', width: 100, fixed: true, left: 150, zIndex: 2 },
  { key: 'age', label: '年齢', width: 80 },
  { key: 'gender', label: '性別', width: 80 },
  { key: 'diaper', label: '기저귀 항목', width: 220 },
  // 날짜 컬럼은 daysInMonth로 동적 생성
];

export const DIAPER_TYPES = [
  { label: 'テープ型', value: 'tape' },
  { label: 'パンツ型', value: 'panty' },
  { label: 'パッド型', value: 'pad' },
]; 