# 作答類型（attemptType）契約

學生練習使用以下三個固定值。新增記錄或分析報表時，必須沿用相同拼法：

|`attemptType`|用途|寫入 `attemptLog`|提交 Google Sheets|
|---|---|---|---|
|`initial`|完成一輪完整練習|是|是|
|`wrong_retry`|完成一輪錯題重做|是|是|
|`single_retry`|在結果頁重做單一題目|否；只寫入本機 `questionEventLog`|否|

`single_retry` 不增加正式作答次數、不改正式分數，亦不修改尚未完成的錯題集合。Google Sheets endpoint 接收的新格式 `attemptLog` 只應包含 `initial` 或 `wrong_retry`。
