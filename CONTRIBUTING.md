# Navidrome 贡献指南

Navidrome 是一个流媒体服务，让你可以随时随地欣赏自己的音乐收藏。我们欢迎你为这个开源项目做出贡献，让 Navidrome 变得更好。如果你想为 Navidrome 做贡献，需要遵循以下一些基本准则。

- [提问支持性问题](#asking-support-questions)
- [行为准则](#code-of-conduct)
- [问题（Issues）](#issues)
- [拉取请求（Pull Requests）](#pull-requests)


## 提问支持性问题
我们有一个活跃的[讨论论坛](https://github.com/navidrome/navidrome/discussions)，用户和开发者都可以在那里提问。请不要使用 GitHub 的 issue 跟踪器来提问。

## 行为准则
请阅读以下[行为准则](https://github.com/navidrome/navidrome/blob/master/CODE_OF_CONDUCT.md)。

## 问题（Issues）
在我们的代码库中发现了问题或 bug？有一个想提出或与开发者讨论的绝妙想法？你可以通过向 GitHub 仓库提交一个 [issue](https://github.com/navidrome/navidrome/issues/new/choose) 来提供帮助。

**在新建 issue 之前，请先通过搜索 [issues](https://github.com/navidrome/navidrome/issues) 检查该问题是否已经被提出过**

## 拉取请求（Pull requests）
在提交拉取请求之前，请确保你完成以下事项：
- 如果尚不存在，为该拉取请求打开一个对应的 issue。可以按照[这些准则](#issues)来创建 issue
- 确保没有与你提交内容对应的、已打开或已关闭的拉取请求，以避免重复劳动。
- 搭建[开发环境](https://www.navidrome.org/docs/developers/dev-environment/)
- 在你 fork 的仓库上创建一个新分支，并在其中进行修改。分支的命名约定为：`<Issue 标题>/<Issue 编号>`。示例：
```
    git checkout -b adding-docs/834 master
```
- 提交信息应遵循[特定约定](#commit-conventions)
- 确保通过 git commit 的 `--signoff` 选项为提交提供 DCO 签署
- 提供将通过你的拉取请求关闭的 issue 链接。

### 提交约定
每条提交信息都必须遵循以下格式：
```
<type>(scope): <description>

[optional body]
```
这样可以提高信息的可读性

#### 类型（Type）
它可以是以下之一：
1. **feat**：新增一项新功能
2. **fix**：修复 bug
3. **sec**：修复安全问题
4. **docs**：文档变更
5. **style**：样式变更
6. **refactor**：代码重构
7. **perf**：影响性能的代码
8. **test**：更新或改进现有测试
9. **build**：构建流程的变更
10. **revert**：回退到之前的提交
11. **chore**：更新 grunt 任务等

如果你的拉取请求中存在破坏性变更，请在可选的正文部分添加 `BREAKING CHANGE`

#### 范围（Scope）
进行更改的文件或文件夹。如果不止一个，你可以任选其一提及

#### 描述（Description）
对问题的简短描述

#### Issue 编号
由此拉取请求修复的 issue。

正文是可选的。它可以包含对所进行更改的简短描述。

遵循以上所有准则后，一条理想的提交看起来会是：
```
    git commit --signoff -m "feat(themes): New-theme - #834"
```

提交后，将你的提交推送到你 fork 的分支，并从那里创建一个拉取请求。
拉取请求的标题可以与 `<type>(scope): <description> - <issue number>` 相同
拉取请求正文的一种示例布局如下：
```
Closes <Issue number along with link>

Description (What does the pull request do)

Changes (What changes were made )

Screenshots or Videos

Related Issues and Pull Requests(if any)

```
