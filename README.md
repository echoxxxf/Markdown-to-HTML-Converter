# Markdown → HTML コンバータ
Markdownを貼り付けて「変換＆ダウンロード」を押すと、見出し毎にアコーディオン構造にまとめたHTMLを生成します。

## 対応済Markdown記法
### 見出し
h1〜h6タグに対応。
```
# Heading 1
## Heading 2
```

### 改行・空行
改行のみで対応。行末のbrタグや半角スペースは改行には影響せず、そのまま出力されます。  
1行空けも2行空けも得られる結果は同様です。pタグで対応されるため、空行をたくさん入れても空白スペースは増えません。

### リスト
```
- Unordered list item 1
  - Nested item 1
  - Nested item 2
- Unordered list item 2
```

### 番号付きリスト
```
1. Ordered item 1
2. Ordered item 2
  1. Nested ordered 1
  2. Nested ordered 2
```

### コード
#### インライン
`テキストやコード`
#### 複数行
````
```
コード1
コード2
コード3
```
````

### 引用
```
> This is a blockquote.
> It can span multiple lines and include Markdown syntax.
```

### リンク
```
[タイトル](URL)
```


### 画像
```
![代替テキスト](URL)
```


### テーブル
```
| Name       | Age | City      |
|------------|-----|-----------|
| Alice      | 25  | New York  |
| Bob        | 30  | London    |
| Charlie    | 28  | Tokyo     |
```

### 文字装飾
- 太字: `**bold**`
- 斜体: `*italic*`
- 下線: `__underline__`
- 打ち消し線: `~~strikethrough~~`

### 水平線
`---` or `***` or `___`


### GitHub Alerts
#### Note
> [!NOTE]
> Useful information that users should know, even when skimming content.

```
> [!NOTE]
> Useful information that users should know, even when skimming content.
```

#### Tip

> [!TIP]
> Helpful advice for doing things better or more easily.

```
> [!TIP]
> Helpful advice for doing things better or more easily.
```

#### Important
> [!IMPORTANT]
> Key information users need to know to achieve their goal.

```
> [!IMPORTANT]
> Key information users need to know to achieve their goal.
```

#### Warning
> [!WARNING]
> Urgent info that needs immediate user attention to avoid problems.

```
> [!WARNING]
> Urgent info that needs immediate user attention to avoid problems.
```

#### Caution
> [!CAUTION]
> Advises about risks or negative outcomes of certain actions.

```
> [!CAUTION]
> Advises about risks or negative outcomes of certain actions.
```

## 特殊な文字列の装飾
### 文字列の置換
`{}` で囲った文字列はファイルを開く度にテキストの置換が可能です。  
- `{HO1}` → 生成したHTMLファイルを開いたときに「花子」などに置換可能

### フォント色
#### デフォルト（赤色）
`@@テキスト@@` で囲った文字列は、デフォルトで文字色が赤色（#FF0000）になります。  
- `@@主人公@@` → #FF0000で「主人公」と表示

#### 色指定
`@@#RRGGBB テキスト@@` で囲った文字列は、指定した色で文字が表示されます（3桁・6桁カラーコード対応）。  
- `@@#f00 赤文字@@` → #f000で「赤文字」と表示  
- `@@#0054ff 青文字@@` → #0054ffで「青文字」と表示

### ハイライト
#### デフォルト（橙色）
`%%テキスト%%` で囲った文字列は、デフォルトで文字背景が橙色（#FFA500）になります。  
- `%%強調%%` → #FFA500でハイライトされ、「強調」と表示

#### 色指定
`%%#RRGGBB テキスト%%` で囲った文字列は、指定した色でハイライトできます（3桁・6桁カラーコード対応）。
- `%%#a6ff4a 背景色%%` → #a6ff4aでハイライトされ、「背景色」と表示
