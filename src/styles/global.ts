import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
    *, ::before, ::after {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    :root,
    [data-theme="light"] {
        --White: #fff;
        --Black: #0f172a;

        --Main-Blue: #1E3A5F;
        --Main-White:#F8F7F5;


        --Secondary-100: #525252;
        --border-1: #a2a2a2;

        --Off-White: #f1f5f8;
        --Red: red;
        --Green: green;
        --Primary-Blue-main: #2F80ED;
        --dark:#212428;
        --dark-10: rgba(255, 255, 255, .15);
        --dark-15: #a2a2a2;
        --dark-20: #ADB3BA;
        --dark-25: #727272;
        --dark-30: #848C97;
        --dark-Orange: #ff343f;

        --Gkoi-Red: #EB2127;
        --Secondary-100: #EDF1F3;
        --Secondary-200: #DCE4E8;
        --Secondary-300: #ACB5BB;
        --Secondary-500: #44444A;
        --Secondary-600: #2C2C30;
        --Secondary-700: #161618;
        --Secondary-800: #111113;
        --Secondary-900: #020408;

        --Auth-Panel-Bg: #1E3A5F;

        --Success-700: #027a48;
        --Error-600: #d92d20;

        /* Semantic surface tokens (theme-aware) */
        --Surface-Page: #f8fafc;
        --Surface-Card: #ffffff;
        --Surface-Muted: #f1f5f9;
        --Border-Subtle: #e2e8f0;
        --Text-Primary: #0f172a;
        --Text-Secondary: #64748b;
    }

    [data-theme="dark"] {
        --White: #202124;
        --Black: #f1f3f4;

        --Main-White: #202124;
        --Main-Blue: #4285f4;

        --Auth-Panel-Bg: #0f2540;

        --Off-White: #202124;
        --border-1: #3c4043;

        --Surface-Page: #191919;
        --Surface-Card: #202124;
        --Surface-Muted: #2a2b2e;
        --Border-Subtle: #3c4043;
        --Text-Primary: #f1f3f4;
        --Text-Secondary: #9aa0a6;
    }

    body {
        background: var(--Surface-Page);
        color: var(--Text-Primary);
        transition: background 0.2s ease, color 0.2s ease;
    }

    button {
        border: none;
        outline: none;
        cursor: pointer;
    }

    html {
        min-height: 100vh;
    }

    body,
    .ql-toolbar,
    .ql-editor  {
        /* font-family: DM Sans, sans-serif, Helvetica, Arial; */
        font-family: "DM Sans";
        /* font-style: normal; */
    }

    body {
        margin: 0 auto;
        font-optical-sizing: auto;
       
        overflow-x: hidden;

        
    }

    body, 
    .scrollbar,
    .scrollbar-transparent {
        &::-webkit-scrollbar {
            width: 7.5px;
        }

        &::-webkit-scrollbar-thumb {
            background: var(--Black);

            border-radius: .25em;
            width: 100%;
        }

        &::-webkit-scrollbar-track {
            background: var(--Secondary-600);
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
    }

    ul, li {
        text-decoration: none;
        list-style: none;
    }

`;

export default GlobalStyle;
