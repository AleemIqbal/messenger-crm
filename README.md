<p align="center">
  <img src="https://github.com/AleemIqbal/messenger-crm/blob/main/banner.png" alt="Messenger CRM - Best CRM for Facebook Messenger" width="100%">
</p>

<h1 align="center">💬 Messenger CRM — Smart CRM for Facebook Messenger</h1>

<p align="center">
  <strong>The best CRM for Facebook Messenger.</strong> A free, lightweight Chrome extension that turns Facebook Messenger into a powerful CRM messaging platform — track conversations, organize contacts with custom labels, and send template messages instantly.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#faq">FAQ</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Chrome%20Extension-blue?logo=googlechrome" alt="Chrome Extension">
  <img src="https://img.shields.io/badge/Price-Free-brightgreen" alt="Free">
  <img src="https://img.shields.io/badge/Manifest-V3-orange" alt="Manifest V3">
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="MIT License">
</p>

---

## 🚀 What is Messenger CRM?

**Messenger CRM** is a free, open-source Chrome extension that adds CRM capabilities directly inside Facebook Messenger. Unlike complex solutions like Zoho CRM, Messenger CRM is purpose-built as a **messenger-based CRM** that works where you already chat — no tab switching, no data exports, no learning curve.

Whether you're a freelancer, small business owner, or sales professional, this **Facebook Messenger CRM** helps you:

- 🏷️ **Label conversations** — Mark chats as Done, Pending, Not Interested, or create custom labels
- 📝 **Use message templates** — Send pre-written replies with one click
- 📊 **Manage contacts** — Full CRM dashboard with search, filter, and export
- 🎨 **Customize everything** — Custom label colors, icons, and display modes

Stop losing track of prospects in your Facebook Messenger inbox. **Messenger CRM** is the **best CRM for Facebook Messenger** — completely free.

---

## ✨ Features

### 🏷️ Smart Label System
Organize every conversation with customizable status labels. Built-in labels include **Done (Bought)**, **In Pending**, and **Not Interested** — or create unlimited custom labels with your own names, colors, and icons.

### 📝 Template Messaging
Speed up replies with message templates. Built-in templates for common scenarios (reminders, thank you, introductions, follow-ups) plus create your own custom templates. Insert directly into the Messenger composer with one click.

### 📊 Full CRM Dashboard
A dedicated dashboard to manage all your Facebook Messenger contacts:
- **Search & Filter** — Find any contact instantly
- **Bulk Actions** — Select multiple contacts for batch operations
- **Pagination** — Handle hundreds of contacts efficiently
- **Import/Export** — Backup and restore all CRM data as JSON

### 🎨 Flexible Display Modes
Three ways to visualize label colors in Messenger:
| Mode | Description |
|------|-------------|
| **Color Symbol** | White icon background, colored ✓/✕/⏳ symbol (default) |
| **Use in Icon** | Label color fills the entire status icon badge |
| **Color Conversations** | Subtle color tint on the entire conversation row |

### 🔄 Real-Time Sync
Changes made in the Dashboard sync instantly to Messenger — no reload required. Edit a label's name, color, or icon and see it update everywhere immediately.

### 🔒 Privacy First
All data is stored **locally** in your browser using Chrome's storage API. Nothing is sent to any server. Your contacts, labels, and templates never leave your device.

---

## 📦 Installation

### From Source (Developer Mode)

1. **Clone the repository**
   ```bash
   git clone https://github.com/AleemIqbal/messengersell.git
   ```

2. **Open Chrome Extensions**
   - Navigate to `chrome://extensions/`
   - Enable **Developer Mode** (toggle in the top-right corner)

3. **Load the extension**
   - Click **"Load unpacked"**
   - Select the `messenger-crm-extension` folder from the cloned repository

4. **Open Messenger**
   - Go to [messenger.com](https://messenger.com) or [facebook.com/messages](https://facebook.com/messages)
   - You'll see CRM status icons appear on each conversation

---

## 🛠️ How It Works

### In Facebook Messenger

Once installed, Messenger CRM enhances your Messenger inbox:

1. **Status Icons** — A small icon badge appears on each conversation showing its CRM status
2. **Click to Label** — Click the icon to open a popup menu with all your labels
3. **Filter Bar** — A filter bar at the bottom lets you view only conversations with a specific label
4. **Template Button** — A 📝 button near the emoji picker opens the template selector
5. **One-Click Insert** — Pick a template and it's instantly typed into the message composer

### In the Dashboard

Click the extension icon to open the full CRM dashboard:

- **Contacts Page** — View all tracked contacts with name, avatar, status, and online indicator
- **Labels Page** — Create, edit, and delete custom labels with colors and icons
- **Templates Page** — Manage built-in and custom message templates
- **Settings Page** — Configure how label colors display in Messenger
- **Import/Export** — Backup all data or restore from a previous backup

---

## 📸 Screenshots

### Messenger Integration
- Status icons on every conversation
- Click-to-label popup menu
- Filter bar for quick filtering
- Template picker in the message composer

### CRM Dashboard
- Full contacts management
- Custom labels with colors and icons
- Editable message templates
- Display mode settings

---

## 🏗️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Extension | Chrome Manifest V3 |
| Frontend | Vanilla HTML, CSS, JavaScript |
| Storage | Chrome Storage API (local) |
| UI Font | [Inter](https://fonts.google.com/specimen/Inter) (Google Fonts) |
| Architecture | Content Script + Dashboard SPA |

---

## 📁 Project Structure

```
messenger-crm-extension/
├── manifest.json        # Chrome extension manifest (V3)
├── content.js           # Injected into Messenger — labels, filters, templates
├── styles.css           # Styles for Messenger UI injections
├── popup.html           # Extension popup (opens dashboard)
├── dashboard.html       # Full CRM dashboard page
├── dashboard.js         # Dashboard logic — contacts, labels, templates, settings
├── dashboard.css        # Dashboard styles
├── favicon.png          # Extension icon
└── banner.png           # README banner
```

---

## ❓ FAQ

### Is Messenger CRM really free?
Yes! Messenger CRM is **100% free and open source**. No pricing plans, no premium tiers, no hidden costs. Unlike paid alternatives like Genius Messenger CRM, this extension is completely free to use.

### Does it work with Facebook Messenger on mobile?
Messenger CRM is a **Chrome extension** and works exclusively in desktop browsers. It supports both [messenger.com](https://messenger.com) and [facebook.com/messages](https://facebook.com/messages).

### Is my data safe?
Absolutely. All data is stored **locally in your browser** using Chrome's built-in storage API. No data is sent to external servers, no cloud sync, no tracking. Your messenger contacts and CRM data never leave your device.

### Can I use custom labels?
Yes! You can create unlimited custom labels with:
- Custom name (up to 30 characters)
- 12 color options
- 16 icon/emoji options
- Full backward compatibility with default labels

### Does it integrate with other CRMs?
Messenger CRM is a **standalone messenger-based CRM** designed to work directly inside Facebook Messenger without requiring external integrations. If you need CRM with Messenger integration alongside tools like Zoho CRM, HubSpot, or WhatsApp Messenger CRM, you can export your data as JSON and import it into other systems.

### How is this different from Zoho CRM Messenger or other enterprise CRMs?
Unlike enterprise CRM messaging platforms (Zoho CRM, CRM Plus, MessageBird CRM, etc.), Messenger CRM is:
- **Free** — No subscription or per-seat pricing
- **Lightweight** — A simple Chrome extension, not a full SaaS platform
- **Privacy-focused** — All data stays local, nothing in the cloud
- **Purpose-built** — Designed specifically for Facebook Messenger, not a generic CRM messaging service

### Why does my Facebook Messenger keep closing?
If Facebook Messenger keeps force closing or you're experiencing messenger force close issues, it's unrelated to this extension. Messenger CRM is a lightweight content script that doesn't interfere with Messenger's core functionality. Try clearing your browser cache or disabling other extensions.

### Can I use templates for customer support?
Yes! The template messaging feature is perfect for **messenger customer support**. Create templates for common responses, FAQs, order updates, and more. Templates support full text formatting and can be inserted with one click.

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Ideas for Contribution
- 🌐 Multi-language support
- 📊 Analytics and reporting
- 🔗 Cross-app communication features
- 📱 Integration with messaging apps beyond Messenger
- 🤖 AI-powered smart replies

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🌟 Star History

If you find Messenger CRM useful, please ⭐ **star this repository** — it helps others discover the **best free Facebook Messenger CRM** extension!

---

## 🔗 Related Keywords

<details>
<summary>Related Topics & Searches</summary>

This project is relevant to users searching for: best CRM for Facebook Messenger, Facebook Messenger CRM free, CRM for Messenger, Messenger based CRM, FB Messenger CRM, CRM Messenger Facebook, CRM with Messenger integration, CRM messaging platform, CRM messaging service, CRM messaging app, smart Messenger CRM, Messenger help CRM, CRM para Messenger, CRM WhatsApp Messenger, WhatsApp Messenger CRM, Zoho CRM Messenger, smooth Messenger Zoho CRM, Facebook Messenger Zoho CRM, Zoho CRM vs CRM Plus, Genius Messenger CRM Chrome extension, Genius Messenger CRM pricing, MessageBird CRM, message plane CRM integration, CRM messaging cloud, CRM messaging company, CRM messaging for Bigin, CRM HR Messenger, CRM con WhatsApp integrado, contact Facebook Messenger, contact Facebook Messenger support, Messenger customer support, Messenger Zapier, Messenger Zendesk, my Messenger CRM, message CRM, Messenger guidelines, Messenger healthcare.

</details>

---

<p align="center">
  Made with ❤️ for the Messenger community
</p>
