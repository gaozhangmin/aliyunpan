# BoxPlayer Promotion Design

Date: 2026-05-12

## Goal

Increase awareness, downloads, and real user feedback for BoxPlayer, the public-facing name of the `aliyunpan` open-source project.

The campaign should present BoxPlayer as a free, open-source, cross-platform multi-cloud media player with unusually broad cloud drive support, especially valuable for Linux, NAS, and home media users.

## Positioning

Use **BoxPlayer** as the public product name. Use `aliyunpan` only as the GitHub repository and open-source project name.

Primary message:

> BoxPlayer is a free, open-source, cross-platform multi-cloud media player. It supports Aliyun Drive, Baidu Netdisk, 123Pan, 115 Drive, PikPak, OneDrive, Box, Dropbox, WebDAV, local media libraries, and media servers such as Emby, Jellyfin, and Plex.

Priority claims:

1. Free and open source, with source code available under the MIT License.
2. Broad support for both Chinese and international cloud drives: Aliyun Drive, Baidu Netdisk, 123Pan, 115 Drive, PikPak, OneDrive, Box, Dropbox, and WebDAV.
3. Strong Linux story: AppImage, deb, pacman, zip, and multi-architecture packages make BoxPlayer rare among cloud-drive media players on Linux.
4. More than a file manager: it includes media playback, media library organization, TMDB metadata scraping, poster walls, aggregated search, subtitles, audio track switching, quality switching, playlists, and third-party player integration.
5. Useful beside existing media servers: Emby, Jellyfin, and Plex users can use it as a complementary aggregation and browsing layer.

Avoid aggressive claims such as "crushes every competitor" or "absolutely safe." In community posts, prefer "project sharing," "open-source tool," and "welcome feedback" language.

## Channel Strategy

Do not use GitHub as a posting channel. GitHub remains the traffic destination for source code, releases, downloads, issues, and stars.

### Chinese Core User Communities

Target platforms:

- V2EX
- Linux.do
- 52pojie
- Coolapk
- Zhihu
- Tieba or relevant Douban groups

Message style:

- Chinese, direct, and practical.
- Lead with "free/open-source multi-cloud media player."
- Mention broad cloud drive support early.
- Use a humble community-sharing tone and invite testing, feedback, and issues.

Example title:

> 我做了一个免费开源的多网盘聚合播放器 BoxPlayer，支持阿里/百度/115/123/PikPak/OneDrive/Dropbox/Box/WebDAV

### Linux, NAS, And Home Media Communities

Target platforms:

- Linux.do Linux/NAS-related topics
- Ubuntu and Arch Chinese communities
- NAS forums
- Emby, Jellyfin, and Plex user communities
- Reddit r/selfhosted
- Reddit r/linux

Message style:

- Emphasize Linux packages, AppImage, deb, pacman, and multi-architecture builds.
- Emphasize home media workflows, WebDAV, remote Aria2 downloads, and media server support.
- Mention that BoxPlayer is especially useful where cloud drive clients and media players are fragmented.

Example title:

> BoxPlayer: a free open-source cloud-drive media player with Linux builds and Emby/Jellyfin/Plex support

### Open-Source Developer Communities

Target platforms:

- OSChina
- Juejin
- Reddit r/opensource
- Hacker News Show HN

Message style:

- Emphasize MIT License, Electron, Vue, TypeScript, cross-platform builds, and contribution opportunities.
- Avoid over-centering Chinese cloud drive context for English audiences; present it as multi-cloud and media-server aggregation.

Example title:

> Show HN: BoxPlayer, an open-source cross-platform player for cloud drives and media servers

### Long-Form Content Hub

Target platforms:

- Zhihu article
- Juejin article
- WeChat official account
- Personal blog, if available

Purpose:

- Serve as the source article for shorter posts.
- Explain the project story, supported platforms, supported drives, Linux value, installation, open-source status, and feedback channels.

Suggested title:

> 我做了一个免费开源的多网盘聚合播放器 BoxPlayer

## Content Assets

Create a reusable promotion package instead of one universal post.

Required assets:

1. Long Chinese article for Zhihu, Juejin, WeChat, or blog.
2. Short Chinese forum post for V2EX, Linux.do, 52pojie, and Coolapk.
3. Linux/NAS focused post for Linux and home media communities.
4. English post for Reddit, Hacker News, and open-source communities.
5. FAQ and reply templates for common questions.
6. Screenshot selection list and optional cover image brief.

FAQ topics:

- Is BoxPlayer free?
- Is BoxPlayer open source?
- Which cloud drives are supported?
- Why is the repository named `aliyunpan` while the product is called BoxPlayer?
- Does it support Linux?
- How does it relate to Emby, Jellyfin, and Plex?
- Is it safe to use?
- Will using it risk account bans or speed limits?
- Where should users download it?
- Where should users report bugs or request features?

## Screenshot Strategy

Use existing README screenshots as proof points.

Recommended screenshot groups:

1. Media server home and poster wall: proves BoxPlayer is a media player and media library, not only a file manager.
2. Aggregated search and media library list: proves cross-library search and organization.
3. File manager and folder tree: proves cloud drive management.
4. Multi-account login and drive support icons: proves multi-platform account support.

Optional cover image:

- Horizontal layout.
- Left side: "BoxPlayer" headline and short tagline.
- Right side: three to four product screenshots.
- Footer badges: Free, Open Source, Windows, macOS, Linux, Multi-Cloud.

The cover image should avoid exaggerated marketing language and should look like a useful open-source project announcement.

## Publishing Plan

Publish in batches rather than posting everywhere at once.

### Batch 1: Chinese Core Communities

Platforms:

- V2EX
- Linux.do
- 52pojie
- Coolapk
- Zhihu short post or article

Goals:

- Test which title and value proposition gets attention.
- Collect early objections and missing details.
- Improve FAQ and later posts from real feedback.

### Batch 2: Linux, NAS, And Home Media Communities

Platforms:

- Linux/NAS communities
- NAS forums
- Emby/Jellyfin/Plex user groups
- Reddit r/selfhosted
- Reddit r/linux

Goals:

- Reach the highest-fit audience.
- Validate Linux installation flow and package clarity.
- Collect feedback from home media and NAS users.

### Batch 3: English And Open-Source Communities

Platforms:

- Reddit r/opensource
- Hacker News Show HN
- OSChina
- Juejin

Goals:

- Reach developers and overseas users.
- Encourage stars, downloads, issues, and contributions.

## Risk Controls

- Do not spam or paste identical text across communities.
- Tailor the title, screenshots, and first paragraph to each platform.
- Do not promise "no account ban," "unlimited speed," or "absolute safety."
- Use careful wording around cloud drive access: official SDK/API or common protocol integrations where applicable.
- Explain that the project does not intercept, store, or tamper with user data, consistent with the README disclaimer.
- Include legal and compliance language in long-form posts and FAQ.
- Respect each platform's rules; if a community treats promotional posts strictly, frame it as an open-source project sharing and ask for feedback.

## Success Metrics

Track first-round campaign impact through:

- GitHub stars.
- Release downloads.
- Issue and discussion volume.
- Comment sentiment and recurring questions.
- Linux installation success or failure reports.
- Which message drives the most engagement: multi-cloud support, Linux support, open source, media library, or media server aggregation.

## Execution Scope

The next implementation plan should produce:

1. Platform-specific posting list and priority order.
2. Long Chinese article draft.
3. Short Chinese forum draft.
4. Linux/NAS draft.
5. English Reddit/Hacker News draft.
6. FAQ and reply templates.
7. Screenshot-to-use mapping.
8. Optional cover image brief or generated asset plan.
9. Manual posting checklist for each platform.

Direct automated posting is out of scope unless the user explicitly opens a logged-in browser session and authorizes assistance for a specific platform. Even with authorization, posts should be submitted one by one and adapted to platform norms.
