# Plan: Implement Multimodal AI Integration

We will implement photo/image capture, file uploading, and voice recording with simulated AI processing.

## Tasks

- [x] Task 1: Update Next.js API BFF Route (`/api/generate-list/route.ts`) [7d77ceb]
  - [ ] Add support for `type: "image"` and `type: "audio"`.
  - [ ] Implement `mockPhotoList` mimicking an extracted handwritten paper shopping list.
  - [ ] Implement `mockAudioList` mimicking dictated grocery voice-notes.
  
- [ ] Task 2: Update React state and handlers (`FrontEnd/src/app/page.tsx`)
  - [ ] Integrate React `useRef` for Camera/Upload file inputs and Audio microphone inputs.
  - [ ] Create file reading logic using `FileReader` to parse files to Base64 strings.
  - [ ] Update `handleGenerateList` to accept `type` and optional binary `payload`.
  - [ ] Integrate granular loader states (`loadingType === 'image' | 'audio' | 'text'`).

- [ ] Task 3: Build the UI triggers & Cognitive Launcher panel visibility toggles (`FrontEnd/src/app/page.tsx`)
  - [ ] Hide the cognitive launcher ("Armá tu lista" glassmorphic drawer) on the Home tab by default.
  - [ ] Add a floating "List Icon" (a red glowing circular action button or circular list button 📋) on the Home page to toggle deployment of this launcher.
  - [ ] Integrate file picker inputs linked to the Camera button (giving a dropdown or choice to take a photo OR upload an existing image).
  - [ ] Add the mic button triggers to record/upload voice notes.

- [ ] Task 4: Testing & Verification
  - [ ] Add/update Jest tests in `FrontEnd/src/app/page.test.tsx` to verify launcher visibility toggling.
  - [ ] Test the photo, upload, and audio trigger mock integrations successfully.
