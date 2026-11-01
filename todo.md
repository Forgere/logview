# HyperLog → logview 迁移进度

React 源码位置: `../HyperLog/`

## 核心功能

### 已完成 ✅

- [x] **Monaco Editor 集成** - `useMonacoEditor` hook，自定义 logview 语言，语法高亮
- [x] **文件流式加载** - `FileStreamer` 类，分块加载，大文件支持
- [x] **搜索功能** - SearchBar 组件，正则/大小写/全词匹配，搜索导航
- [x] **搜索状态管理** - `searchStore`，搜索匹配结果，当前匹配索引
- [x] **拖拽上传** - `DragUpload` 组件
- [x] **基础 Header** - `AppHeader` 组件，文件信息显示，状态指示
- [x] **日志状态管理** - `logStore`，文件加载，流式进度
- [x] **标记状态管理** - `markerStore`，书签/标记 CRUD
- [x] **视图设置管理** - `viewStore`，字体大小，换行，高亮规则
- [x] **弹窗状态管理** - 移除未使用的 `modalStore`，弹窗开关由 viewer.tsx 本地 signal 管理
- [x] **配置持久化** - `configService`，按文件扩展名存储配置
- [x] **类型定义** - `types/index.ts`，所有核心类型
- [x] **浮动标记按钮** - 选中文本后显示"Mark Selection"按钮

---

## 弹窗组件 (Modals) ✅

- [x] **GoToLineModal** - 跳转到指定行 (`Ctrl+G`)
  - 位置: `src/components/modals/GoToLineModal.tsx`

- [x] **ShortcutsModal** - 快捷键帮助 (`Shift+?`)
  - 位置: `src/components/modals/ShortcutsModal.tsx`

- [x] **SettingsModal** - 视图设置（字体、行高、换行等）
  - 位置: `src/components/modals/SettingsModal.tsx`

- [x] **HighlightSettingsModal** - 自定义高亮规则管理
  - 位置: `src/components/modals/HighlightSettingsModal.tsx`

- [x] **WatchSettingsModal** - Watch 模式配置
  - 位置: `src/components/modals/WatchSettingsModal.tsx`

- [x] **CompareModal** - 两个标记行的对比视图
  - 位置: `src/components/modals/CompareModal.tsx`

- [x] **AnalysisModal** - AI 分析标记内容
  - 位置: `src/components/modals/AnalysisModal.tsx`

## 面板组件 (Panels) ✅

- [x] **MarkerPanel** - 标记管理面板（底部可折叠）
  - 功能: 虚拟滚动列表、批量选择、行内备注编辑、复制、导出 JSON、删除、跳转
  - 位置: `src/components/panels/MarkerPanel.tsx`

## 交互功能 ✅

- [x] **键盘快捷键系统** - 全局快捷键监听
  - `Ctrl+G` - 跳转行
  - `Ctrl+M` - 仅显示匹配行
  - `F2` / `Shift+F2` - 下一个 / 上一个标记
  - `Shift+?` - 快捷键帮助
  - `Escape` - 关闭弹窗
  - `Enter/Shift+Enter` - 搜索导航

## 通用组件 ✅

- [x] **Modal** - 通用弹窗基础组件
  - 位置: `src/components/ui/Modal.tsx`

---

## 待完善功能

### 集成与连接 ✅

- [x] **SettingsModal 集成** - 将 SettingsModal 连接到 viewer.tsx
- [x] **HighlightSettingsModal 集成** - 将高亮设置连接到 SearchBar
- [x] **WatchSettingsModal 集成** - 将 Watch 模式连接到 MarkerPanel
- [x] **CompareModal 集成** - 将对比功能连接到 MarkerPanel
- [x] **AnalysisModal 集成** - 将分析功能连接到 MarkerPanel
- [x] **ViewProvider 集成** - 将 viewStore 连接到 viewer.tsx

### 高级功能 ✅

- [x] **Watch 模式逻辑** - 在 logStore 中实现 watch 匹配逻辑
  - `PAUSE_ALL` - 匹配时暂停并跳转
  - `MARK_ONLY` - 匹配时自动添加标记

- [x] **Follow 模式** - 自动滚动到底部
  - Follow/Browse 模式切换
  - 流式加载时自动跟随

### Header 功能完善 ✅

- [x] **Watch 状态显示** - Header 显示 WATCHING 状态和模式
- [x] **Follow/Browse 切换** - 视图模式切换按钮

---

## 统计

- **组件已完成**: 31 项
- **待集成/完善**: 0 项
- **完成度**: ~100%

## 设计令牌迁移 ✅

所有硬编码十六进制色与灰度 Tailwind 色（`gray-*` / `blue-*` 等）已替换为 `src/styles.css` 中的语义令牌：

| 旧值                              | 令牌                                   |
| --------------------------------- | -------------------------------------- |
| `#1e1e1e` / `#1a1a1a` / `#141414` | `surface` / `surface-2` / `background` |
| `#252526` / `#2a2d2e`             | `surface-2` / `surface-3`              |
| `#333` / `#444` / `gray-600`      | `border` / `muted-foreground`          |
| `blue-500` / `blue-600`           | `accent-brand`                         |
| `emerald-*` / `green-*`           | `success`                              |
| `red-*`                           | `level-error` / `destructive`          |
| `amber-*`                         | `warning`                              |

Monaco 编辑器主题由 `src/lib/theme.ts` 读取同一套 CSS 变量，配色与外围 UI 保持一致。
