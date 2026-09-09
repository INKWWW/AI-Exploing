# EMO · 键盘动态研究

**在线 Demo：[emo-keyboard-motion.vercel.app](https://emo-keyboard-motion.vercel.app/)**

这是一个以键盘产品演示录屏为参照、使用 Three.js 重建的交互式 3D 动画 Demo。页面将原始影像与实时三维画面并排展示，通过共用的 **9 秒时间轴**，对照键盘特写、键帽抬升、内部机械结构分离和悬浮旋转等过程。

模型使用代码生成，包含键帽、机身、金属框架和弹簧等结构，并通过材质、灯光和阴影呈现细节。运动参数根据录屏画面校准；这是参照影像的视觉重建，并非原始模型或动画工程。

## 页面截图

![原始影像与 Three.js 键盘动画同步对比](docs/demo-screenshot.png)

## 交互功能

- 原片与 Three.js 同步播放、暂停、循环，以及 0.25×、0.5×、1×、1.5× 倍速播放。
- 拖动时间轴或输入秒数定位，也可通过四个章节快速跳转。
- 点击 **自由观察**，拖动右侧键盘旋转、滚轮缩放；点击 **跟随原片** 返回动画视角。
- 支持原片静音切换、三维画面全屏和响应式布局；窄屏时上下排列。
- 焦点不在输入框或按钮时，空格播放/暂停，左右方向键以 1/30 秒步长定位。

## 本地运行

使用 Node.js 22.12+（本项目构建验证环境为 Node.js 24），在本目录执行：

```bash
npm ci
# 将参照视频和封面放入 public/，见下方素材说明
npm run dev
```

打开终端显示的本地地址，通常为 http://127.0.0.1:5173。

```bash
npm run build
npm run preview
```

## 项目结构

```text
emo-keyboard-motion/
├── index.html                 # 页面结构及播放控件
├── src/
│   ├── main.js                # Three.js 场景、同步播放与交互
│   ├── model.js               # 参数化键盘和机械结构模型
│   ├── motion.js              # 9 秒动画时间轴
│   ├── *-motion.js            # 运动轨迹采样
│   ├── *.json                 # 姿态和运动数据
│   └── style.css              # 页面样式及响应式布局
├── public/                    # 9 秒参照片、封面和图标
├── docs/demo-screenshot.png   # 页面截图
├── scripts/                   # 运动投影校验脚本
├── analysis/                  # 校验使用的标注数据
└── vercel.json                # Vercel 构建配置
```

## 校验

```bash
node scripts/verify-keyboard.mjs
node scripts/verify-mechanism.mjs
```

校验检查标注点的投影误差、姿态有效性和淡出/复位行为，不代表逐像素一致性验证。

## 部署

使用 Vercel 导入本仓库，将 **Root Directory** 设置为 `emo-keyboard-motion`，框架选择 **Vite**，构建命令为 `npm run build`，输出目录为 `dist`。应用本身不需要环境变量。

## 参照素材

原始参照来自用户提供的 X 录屏。本次代码同步暂不包含视频及封面；完整对比效果可查看在线 Demo。本地运行原片对比时，将 9 秒 MP4 放到 `public/reference-9s.mp4`，并将封面放到 `public/poster.jpg`。缺少素材时，三维模型仍可通过「自由观察」查看。
