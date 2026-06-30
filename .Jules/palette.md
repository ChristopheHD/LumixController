## 2025-05-24 - Photobooth Async Feedback Pattern
**Learning:** For physical-interaction based apps (like a photobooth), visual and state feedback (countdown, flash, disabled states) are critical to prevent double-triggers and provide user confidence during slow async camera operations.
**Action:** Always implement a clear "in-progress" state and disable trigger elements when performing long-running hardware-interfacing tasks.
