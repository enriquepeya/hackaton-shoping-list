# Plan: Implement Multimodal AI Integration

We will implement photo/image capture, file uploading, and voice recording with simulated AI processing.

## Tasks

- [x] Task 1: Update Next.js API BFF Route (`/api/generate-list/route.ts`) [7d77ceb]
  - [ ] Add support for `type: "image"` and `type: "audio"`.
  - [ ] Implement `mockPhotoList` mimicking an extracted handwritten paper shopping list.
  - [ ] Implement `mockAudioList` mimicking dictated grocery voice-notes.
  
- [x] Task 2: Update React state and handlers (`FrontEnd/src/app/page.tsx`) [64bb481]
  - [x] Integrate React `useRef` for Camera/Upload file inputs and Audio microphone inputs.
  - [x] Create file reading logic using `FileReader` to parse files to Base64 strings.
  - [x] Update `handleGenerateList` to accept `type` and optional binary `payload`.
  - [x] Integrate granular loader states (`loadingType === 'image' | 'audio' | 'text'`).

- [x] Task 3: Build the UI triggers & Cognitive Launcher panel visibility toggles (`FrontEnd/src/app/page.tsx`) [64bb481]
  - [x] Hide the cognitive launcher ("Armá tu lista" glassmorphic drawer) on the Home tab by default.
  - [x] Add a floating "List Icon" (a red glowing circular action button or circular list button 📋) on the Home page to toggle deployment of this launcher.
  - [x] Integrate file picker inputs linked to the Camera button (giving a dropdown or choice to take a photo OR upload an existing image).
  - [x] Add the mic button triggers to record/upload voice notes.

- [x] Task 4: Testing & Verification [64bb481]
  - [x] Add/update Jest tests in `FrontEnd/src/app/page.test.tsx` to verify launcher visibility toggling.
  - [x] Test the photo, upload, and audio trigger mock integrations successfully.

- [x] Task 5: Implement OCR interim reading screen and line-by-line animated step state (`FrontEnd/src/app/page.tsx`) [9e27ea1]
  - [x] Create `isOcrAnalyzing` and `ocrStep` states.
  - [x] Implement `triggerOcrAnalysis` helper running a sequential interval timer.
  - [x] Render the animated simulated handwriting preview block inside the build tab during OCR.

- [x] Task 6: Implement simulated shareable link generator and beautiful Share modal popup (`FrontEnd/src/app/page.tsx`) [9e27ea1]
  - [x] Add a prominent "Compartir Lista" button on both generated and saved list cards.
  - [x] Build a modal dialog displaying the share link, standard copy button, and WhatsApp/Slack share targets.
  
- [x] Task 7: Build the Shared List Preview screen when URL has `?share=...` or when previewed in-app (`FrontEnd/src/app/page.tsx`) [9e27ea1]
  - [x] Detect query param `share` on load using React `useEffect`.
  - [x] Render a gorgeous "Vista de Lista Compartida" with custom header, list products, and a simulated "Importar a mis listas" action.

- [x] Task 8: Testing & Verification (`FrontEnd/src/app/page.test.tsx`) [9e27ea1]
  - [x] Add tests verifying toggle state triggers, OCR interim screen step progression, and share link coping.
