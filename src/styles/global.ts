import { createGlobalStyle } from "styled-components";

/**
 * managerenta design tokens
 * ---------------------------------------------------------------------------
 * Direction: warm & friendly (Notion / Cal.com).
 * Brand kept (deep navy #1E3A5F + warm off-white).
 * All legacy --* vars are preserved as aliases so existing styled files keep
 * working; underlying values are nudged warmer and consistent.
 *
 * Naming:
 *   --mr-color-*   colour tokens (semantic + scale)
 *   --mr-radius-*  border radius scale
 *   --mr-shadow-*  elevation scale
 *   --mr-space-*   spacing scale (4px base)
 *   --mr-font-*    typography
 *   --mr-ease-*    motion
 */
const GlobalStyle = createGlobalStyle`
    *, ::before, ::after {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    :root,
    [data-theme="light"] {
        /* === Brand ============================================ */
        --mr-color-brand:           #1E3A5F;
        --mr-color-brand-hover:     #284E7E;
        --mr-color-brand-active:    #16304F;
        --mr-color-brand-soft:      #EAF0F7;
        --mr-color-brand-on:        #FFFFFF;

        /* warm friendly accent (used sparingly: highlights, dots, illustrations) */
        --mr-color-accent:          #D97757;
        --mr-color-accent-soft:     #FBEDE5;

        /* === Surfaces (warm-tinted) =========================== */
        --mr-color-page:            #FAF8F4;  /* outer canvas */
        --mr-color-card:            #FFFFFF;  /* cards, dialogs */
        --mr-color-card-elevated:   #FFFFFF;
        --mr-color-muted:           #F4F0EA;  /* subtle wash */
        --mr-color-subtle:          #EFEAE2;  /* hover row, chip bg */
        --mr-color-overlay:         rgba(20, 14, 4, 0.32);

        /* === Borders ========================================== */
        --mr-color-border:          #EAE3D7;  /* default border (warm) */
        --mr-color-border-strong:   #D7CDBC;
        --mr-color-border-focus:    #1E3A5F;

        /* === Text ============================================= */
        --mr-color-text:            #1A1D24;  /* primary */
        --mr-color-text-muted:      #5B6573;  /* secondary */
        --mr-color-text-subtle:     #8B95A4;  /* tertiary / placeholder */
        --mr-color-text-on-brand:   #FFFFFF;
        --mr-color-text-on-accent:  #FFFFFF;

        /* === Semantic state ================================== */
        --mr-color-success:         #15803D;
        --mr-color-success-soft:    #E3F4EA;
        --mr-color-success-on:      #FFFFFF;

        --mr-color-warning:         #B45309;
        --mr-color-warning-soft:    #FCEFD4;
        --mr-color-warning-on:      #FFFFFF;

        --mr-color-danger:          #B91C1C;
        --mr-color-danger-soft:     #FBE4E4;
        --mr-color-danger-on:       #FFFFFF;

        --mr-color-info:            #1D4E89;
        --mr-color-info-soft:       #E5EEF7;

        /* === Neutral scale (warm-tinted slate) =============== */
        --mr-color-neutral-50:      #FAF8F4;
        --mr-color-neutral-100:     #F4F0EA;
        --mr-color-neutral-200:     #EAE3D7;
        --mr-color-neutral-300:     #D7CDBC;
        --mr-color-neutral-400:     #B0A89A;
        --mr-color-neutral-500:     #8B95A4;
        --mr-color-neutral-600:     #5B6573;
        --mr-color-neutral-700:     #3F4754;
        --mr-color-neutral-800:     #262B33;
        --mr-color-neutral-900:     #1A1D24;

        /* === Radii =========================================== */
        --mr-radius-xs:   4px;
        --mr-radius-sm:   8px;
        --mr-radius-md:   12px;
        --mr-radius-lg:   16px;
        --mr-radius-xl:   20px;
        --mr-radius-2xl:  28px;
        --mr-radius-pill: 9999px;

        /* === Shadows (warm-tinted, soft) ===================== */
        --mr-shadow-xs:  0 1px 2px rgba(30, 24, 12, 0.05);
        --mr-shadow-sm:  0 1px 2px rgba(30, 24, 12, 0.04),
                         0 1px 3px rgba(30, 24, 12, 0.06);
        --mr-shadow-md:  0 2px 4px rgba(30, 24, 12, 0.04),
                         0 6px 16px rgba(30, 24, 12, 0.07);
        --mr-shadow-lg:  0 4px 8px rgba(30, 24, 12, 0.04),
                         0 16px 32px rgba(30, 24, 12, 0.10);
        --mr-shadow-xl:  0 8px 16px rgba(30, 24, 12, 0.06),
                         0 28px 56px rgba(30, 24, 12, 0.14);
        --mr-shadow-focus: 0 0 0 3px rgba(30, 58, 95, 0.18);

        /* === Spacing (4px base) ============================== */
        --mr-space-0:  0;
        --mr-space-1:  4px;
        --mr-space-2:  8px;
        --mr-space-3:  12px;
        --mr-space-4:  16px;
        --mr-space-5:  20px;
        --mr-space-6:  24px;
        --mr-space-7:  28px;
        --mr-space-8:  32px;
        --mr-space-10: 40px;
        --mr-space-12: 48px;
        --mr-space-16: 64px;
        --mr-space-20: 80px;

        /* === Typography ====================================== */
        --mr-font-sans:      "DM Sans", system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        --mr-font-display:   "DM Sans", system-ui, -apple-system, Segoe UI, Roboto, sans-serif;

        --mr-fs-xs:   12px;
        --mr-fs-sm:   13px;
        --mr-fs-md:   14px;
        --mr-fs-base: 15px;
        --mr-fs-lg:   17px;
        --mr-fs-xl:   20px;
        --mr-fs-2xl:  24px;
        --mr-fs-3xl:  30px;
        --mr-fs-4xl:  38px;

        --mr-lh-tight:  1.2;
        --mr-lh-snug:   1.35;
        --mr-lh-normal: 1.5;
        --mr-lh-loose:  1.7;

        --mr-fw-regular:  400;
        --mr-fw-medium:   500;
        --mr-fw-semibold: 600;
        --mr-fw-bold:     700;

        /* === Motion ========================================== */
        --mr-ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
        --mr-ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
        --mr-dur-fast:    120ms;
        --mr-dur-base:    180ms;
        --mr-dur-slow:    280ms;

        /* === Layout ========================================== */
        --mr-content-max:  1240px;
        --mr-nav-height:   64px;
        --mr-sidebar-w:    248px;

        /* =====================================================
           Legacy aliases — KEEP for backward compatibility.
           These resolve to the warm token values above so the
           ~78 existing styled.tsx files inherit the new design.
           ===================================================== */
        --White:            #FFFFFF;
        --Black:            var(--mr-color-text);
        --Off-White:        var(--mr-color-muted);
        --Main-Blue:        var(--mr-color-brand);
        --Main-White:       var(--mr-color-page);
        --Primary-Blue-main: var(--mr-color-brand);
        --Red:              var(--mr-color-danger);
        --Green:            var(--mr-color-success);

        --border-1:         var(--mr-color-border-strong);
        --dark:             var(--mr-color-neutral-800);
        --dark-10:          rgba(255, 255, 255, 0.15);
        --dark-15:          var(--mr-color-border-strong);
        --dark-20:          var(--mr-color-neutral-400);
        --dark-25:          var(--mr-color-neutral-500);
        --dark-30:          var(--mr-color-neutral-500);
        --dark-Orange:      var(--mr-color-accent);

        --Gkoi-Red:         var(--mr-color-danger);

        --Secondary-100:    var(--mr-color-neutral-100);
        --Secondary-200:    var(--mr-color-neutral-200);
        --Secondary-300:    var(--mr-color-neutral-300);
        --Secondary-500:    var(--mr-color-neutral-700);
        --Secondary-600:    var(--mr-color-neutral-800);
        --Secondary-700:    var(--mr-color-neutral-900);
        --Secondary-800:    var(--mr-color-neutral-900);
        --Secondary-900:    var(--mr-color-neutral-900);

        --Auth-Panel-Bg:    var(--mr-color-brand);

        --Success-700:      var(--mr-color-success);
        --Error-600:        var(--mr-color-danger);

        --Surface-Page:     var(--mr-color-page);
        --Surface-Card:     var(--mr-color-card);
        --Surface-Muted:    var(--mr-color-muted);
        --Border-Subtle:    var(--mr-color-border);
        --Text-Primary:     var(--mr-color-text);
        --Text-Secondary:   var(--mr-color-text-muted);
    }

    [data-theme="dark"] {
        --mr-color-brand:           #5A8BD1;
        --mr-color-brand-hover:     #76A0DE;
        --mr-color-brand-active:    #4A78BB;
        --mr-color-brand-soft:      #1B2A3F;
        --mr-color-brand-on:        #FFFFFF;

        --mr-color-accent:          #E8916F;
        --mr-color-accent-soft:     #3A241B;

        --mr-color-page:            #14171C;
        --mr-color-card:            #1B1F26;
        --mr-color-card-elevated:   #20242C;
        --mr-color-muted:           #20242C;
        --mr-color-subtle:          #262B33;
        --mr-color-overlay:         rgba(0, 0, 0, 0.55);

        --mr-color-border:          #2C313A;
        --mr-color-border-strong:   #3C424D;
        --mr-color-border-focus:    #5A8BD1;

        --mr-color-text:            #F1F3F7;
        --mr-color-text-muted:      #A6ADBB;
        --mr-color-text-subtle:     #7A8294;
        --mr-color-text-on-brand:   #FFFFFF;
        --mr-color-text-on-accent:  #FFFFFF;

        --mr-color-success:         #4ADE80;
        --mr-color-success-soft:    #14301F;
        --mr-color-warning:         #FBBF24;
        --mr-color-warning-soft:    #3A2A0E;
        --mr-color-danger:          #F87171;
        --mr-color-danger-soft:     #3A1A1A;
        --mr-color-info:            #60A5FA;
        --mr-color-info-soft:       #16243A;

        --mr-color-neutral-50:      #14171C;
        --mr-color-neutral-100:     #1B1F26;
        --mr-color-neutral-200:     #2C313A;
        --mr-color-neutral-300:     #3C424D;
        --mr-color-neutral-400:     #5A6271;
        --mr-color-neutral-500:     #7A8294;
        --mr-color-neutral-600:     #A6ADBB;
        --mr-color-neutral-700:     #C6CBD4;
        --mr-color-neutral-800:     #E2E5EB;
        --mr-color-neutral-900:     #F1F3F7;

        --mr-shadow-xs:  0 1px 2px rgba(0, 0, 0, 0.30);
        --mr-shadow-sm:  0 1px 2px rgba(0, 0, 0, 0.25),
                         0 1px 3px rgba(0, 0, 0, 0.35);
        --mr-shadow-md:  0 2px 4px rgba(0, 0, 0, 0.30),
                         0 6px 16px rgba(0, 0, 0, 0.40);
        --mr-shadow-lg:  0 4px 8px rgba(0, 0, 0, 0.35),
                         0 16px 32px rgba(0, 0, 0, 0.45);
        --mr-shadow-xl:  0 8px 16px rgba(0, 0, 0, 0.40),
                         0 28px 56px rgba(0, 0, 0, 0.55);
        --mr-shadow-focus: 0 0 0 3px rgba(90, 139, 209, 0.32);

        /* legacy aliases (dark) */
        --White:            var(--mr-color-card);
        --Black:            var(--mr-color-text);
        --Off-White:        var(--mr-color-muted);
        --Main-Blue:        var(--mr-color-brand);
        --Main-White:       var(--mr-color-page);
        --Primary-Blue-main: var(--mr-color-brand);
        --border-1:         var(--mr-color-border-strong);
        --Auth-Panel-Bg:    #0F1A2A;

        --Surface-Page:     var(--mr-color-page);
        --Surface-Card:     var(--mr-color-card);
        --Surface-Muted:    var(--mr-color-muted);
        --Border-Subtle:    var(--mr-color-border);
        --Text-Primary:     var(--mr-color-text);
        --Text-Secondary:   var(--mr-color-text-muted);
    }

    html {
        min-height: 100vh;
    }

    body {
        background: var(--mr-color-page);
        color: var(--mr-color-text);
        font-family: var(--mr-font-sans);
        font-size: var(--mr-fs-base);
        line-height: var(--mr-lh-normal);
        font-feature-settings: "ss01", "cv11";
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
        font-optical-sizing: auto;
        margin: 0 auto;
        overflow-x: hidden;
        transition: background var(--mr-dur-base) var(--mr-ease-out),
                    color var(--mr-dur-base) var(--mr-ease-out);
    }

    .ql-toolbar,
    .ql-editor {
        font-family: var(--mr-font-sans);
    }

    button {
        border: none;
        outline: none;
        cursor: pointer;
        font-family: inherit;
    }

    /* === Scrollbars (warm, subtle) =========================== */
    body,
    .scrollbar,
    .scrollbar-transparent {
        scrollbar-width: thin;
        scrollbar-color: var(--mr-color-neutral-300) transparent;

        &::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }

        &::-webkit-scrollbar-thumb {
            background: var(--mr-color-neutral-300);
            border-radius: var(--mr-radius-pill);
            border: 2px solid transparent;
            background-clip: padding-box;
            transition: background var(--mr-dur-fast) var(--mr-ease-out);
        }

        &::-webkit-scrollbar-thumb:hover {
            background: var(--mr-color-neutral-400);
            background-clip: padding-box;
            border: 2px solid transparent;
        }

        &::-webkit-scrollbar-track {
            background: transparent;
        }
    }

    .scrollbar-transparent {
        &::-webkit-scrollbar-thumb,
        &::-webkit-scrollbar-track {
            background: transparent;
        }
    }

    a {
        text-decoration: none;
        color: inherit;
        transition: color var(--mr-dur-fast) var(--mr-ease-out);

        &:hover {
            color: inherit;
        }
    }

    img {
        border-style: none;
        overflow-clip-margin: content-box;
        overflow: clip;
    }

    input, input:focus, input:hover,
    textarea, textarea:focus, textarea:hover {
        outline: none;
        border: none;
        color: inherit;
        background: inherit;
        font-family: inherit;
    }

    ::placeholder {
        color: var(--mr-color-text-subtle);
        opacity: 1;
    }

    ::selection {
        background: var(--mr-color-brand-soft);
        color: var(--mr-color-brand);
    }

    /* visible keyboard-focus ring, hidden on mouse-clicks */
    :focus-visible {
        outline: 2px solid var(--mr-color-border-focus);
        outline-offset: 2px;
        border-radius: var(--mr-radius-xs);
    }

    ul, li {
        text-decoration: none;
        list-style: none;
    }
`;

export default GlobalStyle;
