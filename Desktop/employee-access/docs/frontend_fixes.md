# Fixes Needed for Mobile App and Desktop

## 1. Registration Forms Must Match the Backend Models

Please update the employee and visitor registration forms on both **mobile** and **desktop** so they align with what the backend expects.

### Employee model

```python
Employee Model {
    fullName: Optional[str] = None
    gender: Optional[str] = None
    employee_id: Optional[str] = None
    DoB: Optional[date] = None
    email: Optional[str] = None
    Phone: Optional[str] = None
}
```

### Visitor model

```python
Visitor Model {
    fullName: str
    gender: Optional[str] = None
    DoB: Optional[date] = None
    email: Optional[str] = None
    Phone: Optional[str] = None
}
```

### What needs fixing

- Make sure the frontend field names match the backend model field names exactly.
- Ensure **employee registration** includes `employee_id`.
- Ensure **visitor registration** does **not** expect `employee_id`.
- Make sure `DoB` is being sent in a backend-compatible date format (YYYY-MM-DD).
- If it is possible for you to compress the image file sizes before sending them to the back-end, please try this out. The reason why is because currently the back-end takes some time uploading multiple pictures. I hope that compressing the pictures might actually make this a bit quicker.
- Alternative approach if you don't want to compress the image sizes. Try to add a clearer loading state to inform the users that some process is happening. (I would prefer this approach as it reduces risk of upload failure if image compression doesn't work or causes issues)
- Check that optional fields are handled properly and do not break submission if left empty.
- Verify both mobile and desktop forms behave consistently.

---

## 2. Fix the Mismatched Registration Workflow

Right now, the mobile app and desktop app do not support the same registration process.

### Current issue

- The **mobile app** allows uploading **5 images** during registration:
     - left
     - right
     - forward
     - up
     - down
- The **desktop app** does not currently support uploading multiple profile images in the same way.

### What needs fixing

- Make the registration workflow the same on both **mobile** and **desktop**.
- Ideally, both platforms should support the same number and type of image uploads.
- The user experience should be consistent so registration works the same regardless of device.

---

## 3. Fix the Desktop Image Upload Ratio

### Current issue

- On desktop registration, the uploaded image ratio appears **squished**.

### What needs fixing

- Fix the desktop image upload/display ratio so images are not distorted.
- It should match the image proportions more closely to what is uploaded from the mobile app.
- Make sure the final stored image output is consistent across both platforms.

---

## 4. Deep Linking Between Mobile and Desktop

If there is time, please try to get the **deep linking** between the mobile app and desktop working properly.

### Goal

- Improve the flow between mobile and desktop so transitions between the two feel connected and intentional.

---

## 5. Build Deliverables

Once the main fixes are done, if there is time, please package both apps so they are easier to run.

### Goal

- Build the **desktop app** into an executable file.
- Build the **mobile app** into an APK.

### Why

This would stop Jamshid from needing to run lots of setup commands manually. He should be able to install the apps and use them more directly.

---

## Suggested Order of Work

1. Fix the registration forms so they match the backend models.
2. Unify the registration workflow between mobile and desktop.
3. Fix the desktop image ratio issue.
4. Try to get deep linking working.
5. Package the desktop app as an executable and the mobile app as an APK.
