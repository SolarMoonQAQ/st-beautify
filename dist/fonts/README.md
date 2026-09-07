# 角色名展示字体

字体仅用于对话角色名（ct-dialogue-name / ct-dialogue-name-head）。正文、台词及心声内容继承宿主字体。

- 古风：ZhiMangXing-Regular.ttf，项目原有的「志莽行」。
- 科技：ZCOOLQingKeHuangYou-Regular.ttf，「站酷庆科黄油体」，方正几何字形。
  来源：https://github.com/google/fonts/tree/main/ofl/zcoolqingkehuangyou
  许可：ZCOOLQingKeHuangYou-OFL.txt。
- 都市异能：MaShanZheng-Regular.ttf，「马善政」，粗笔书法字形。
  来源：https://github.com/google/fonts/tree/main/ofl/mashanzheng
  许可：MaShanZheng-OFL.txt。

新增字体均为原始文件，字重 400，未裁剪字符，分发时保留许可证。字体随 Vite 库构建内嵌，无需请求字体 CDN；缺字时使用系统后备字体。
