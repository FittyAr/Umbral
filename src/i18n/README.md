# Internationalization (i18n) & Community Translations in Umbral

Welcome to the internationalization directory of **Umbral**.

Umbral is an open-source, self-hosted application portal designed for internal tools and homelabs. We strive to make Umbral accessible, intuitive, and welcoming to users all across the globe.

---

## 🌍 Note Regarding AI-Assisted Translations

As an independent open-source project maintained without a budget for hiring professional localization agencies or certified native translators, **the initial translations for many languages in this project were generated and assisted using artificial intelligence**.

We want to express our most sincere apologies for any linguistic imperfections, grammatical oversights, awkward phrasings, or cultural nuances that may have been lost in translation. 

**Under no circumstances is any disrespect or negligence intended toward any language, culture, or native speaker.** We hold immense respect for every language community represented here. The inclusion of these translations comes from a genuine desire to make Umbral usable by people worldwide rather than restricting it solely to Spanish or English.

---

## 🤝 We Welcome Community Contributions & Corrections!

If you are a native speaker or fluent in any of the supported languages, **your help is deeply appreciated!** 

We enthusiastically welcome Pull Requests, bug reports, and suggestions to refine, correct, and elevate the quality of our translations.

### How to Contribute or Fix a Translation

1. **Locate the Dictionary File:**
   - General UI strings live in `src/i18n/<locale>.ts` (e.g., `fr.ts`, `de.ts`, `ja.ts`).
   - Interactive help modals live in `src/i18n/help/<locale>.ts`.

2. **Maintain Key Parity:**
   - Every language file must export the exact same keys as the reference dictionary in `src/i18n/es.ts` (356 UI keys) and `src/i18n/help/es.ts` (162 help keys).
   - If a key is not yet translated or you are unsure, feel free to use standard terminology or leave a note in your PR.

3. **Preserve ICU-lite Placeholders:**
   - Keep variable interpolations intact: `{n}`, `{companyName}`, `{status}`, `{latency}`, `{message}`, etc.
   - For pluralized strings, maintain the format: `{n, plural, one {# app} other {# apps}}`.

4. **Verify Your Changes:**
   Run the automated parity tests locally to ensure no keys were inadvertently removed or misspelled:
   ```bash
   npm run test:i18n
   ```

5. **Open a Pull Request:**
   Submit your PR on GitHub with a description of the improvements made. We will review and merge it with gratitude!

---

## 📋 Supported Languages

Umbral currently includes translations for the following locales:

| Code | Native Name | English Name |
|---|---|---|
| `es` | Español | Spanish *(Historical default)* |
| `en` | English | English |
| `pt` | Português | Portuguese |
| `fr` | Français | French |
| `de` | Deutsch | German |
| `it` | Italiano | Italian |
| `zh` | 简体中文 | Simplified Chinese |
| `ja` | 日本語 | Japanese |
| `ru` | Русский | Russian |
| `nl` | Nederlands | Dutch |
| `pl` | Polski | Polish |
| `ko` | 한국어 | Korean |
| `tr` | Türkçe | Turkish |
| `uk` | Українська | Ukrainian |
| `sv` | Svenska | Swedish |
| `cs` | Čeština | Czech |
| `da` | Dansk | Danish |
| `fi` | Suomi | Finnish |
| `no` | Norsk | Norwegian |
| `hu` | Magyar | Hungarian |
| `ro` | Română | Romanian |

Thank you for helping us make Umbral better for everyone!
