# Specification: Multimodal AI Integration (Camera, Upload & Audio)

This specification outlines the integration of multimodal inputs into the existing Next.js AI Shopping Assistant. It allows users to capture photos (e.g., a handwritten list), upload existing images, or record voice notes to generate shopping lists.

## 1. Architectural Scope

- **Frontend (Client):** 
  - Enhance the existing cognitive launcher in the Home screen (`page.tsx`) to handle native file inputs.
  - Convert captured/uploaded images and audio into Base64 format to be transmitted in a JSON payload.
- **BFF (`/api/generate-list`):**
  - Accept expanded payloads including `type` ("image", "audio", "text") and `payload` (the Base64 string).
  - Respond with specialized mock data representing AI interpretation of images or audio.

## 2. Feature Requirements

### A. Frontend Capabilities
1. **Camera Capture & File Upload:**
   - The existing camera button (`📷`) should open a hidden `<input type="file" accept="image/*">`.
   - The input should support both capturing a new photo directly using the device camera (`capture="environment"`) OR selecting an existing photo from the gallery.
2. **Audio Input:**
   - The existing microphone button (`🎙️`) should trigger a hidden `<input type="file" accept="audio/*" capture="microphone">` to natively capture voice notes on mobile devices.
3. **Data Processing:**
   - Read the selected files using `FileReader`.
   - Convert the binary data to a `Base64` data URL.
   - Dispatch the standard `POST /api/generate-list` request with the new structured body.
4. **UX / Loading States:**
   - Display specific loading states based on the action: 
     - *"Analizando foto de lista con IA..."*
     - *"Interpretando nota de voz..."*
   - Automatically redirect the user to the "IA Assistant" (Build) tab during processing.

### B. Backend (Next.js API Route)
1. **Payload Parsing:**
   - The API will gracefully handle: `{ type: "image", payload: "data:image/jpeg;base64,..." }` or `{ type: "audio", payload: "data:audio/mp3;base64,..." }`.
2. **Mock AI Responses:**
   - Implement `mockPhotoList` simulating the extraction of handwritten grocery items.
   - Implement `mockAudioList` simulating a list dictated by voice.
