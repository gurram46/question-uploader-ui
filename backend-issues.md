# Backend Integration Issues

## Current Status
The frontend is fully functional but encountering issues when submitting data to the backend API.

## Issues Identified

### 1. ~~HTTP 500 Error on Form Submission~~ ✅ FIXED
~~When submitting a form with images, the backend returns a 500 error.~~

**UPDATE**: This is now working! The backend is accepting POST requests successfully (200 status).

### 2. Field Format Requirements
The backend expects multipart/form-data with specific field names and order:

**Required Field Order:**
1. `questionImage` (File, optional)
2. `subjectName` (String)
3. `topicName` (String)
4. `difficultyLevel` (String number "1"-"10")
5. `questionText` (String)
6. `option1Correct` (String "true"/"false")
7. `option1` (String - option text)
8. `option2Correct` (String "true"/"false")
9. `option2` (String - option text)
10. `option3Correct` (String "true"/"false")
11. `option3` (String - option text)
12. `option4Correct` (String "true"/"false")
13. `option4` (String - option text)
14. `explaination` (String - note the spelling)
15. `option1Image` (File, optional)
16. `option2Image` (File, optional)
17. `option3Image` (File, optional)
18. `option4Image` (File, optional)
19. `explainationImage` (File, optional - note the spelling)

### 3. Critical Data Storage/Retrieval Issues

#### A. Difficulty Level Not Saved/Returned Correctly
- **Issue**: When fetching questions via GET `/getquestions`, the difficulty level always shows as "1" regardless of the actual value posted
- **Example**: Posted difficulty_level="5", but GET returns difficulty_level=1
- **Impact**: All questions appear as "Very Easy" regardless of actual difficulty

#### B. Explanation Not Returned
- **Issue**: The explanation field (sent as "explaination" per backend spec) is not returned in GET response
- **Example**: Posted with detailed explanation, but GET response has empty/missing explanation field
- **Impact**: Users cannot see explanations for answers

#### C. Images Not Returned
- **Issue**: Image URLs/paths are not returned in GET response
- **Example**: Posted with option2Image file, but GET response doesn't include image references
- **Impact**: Question and option images are not displayed

## Frontend Implementation

The frontend correctly:
- Sends multipart/form-data (not JSON) for uploads
- Uses the exact field names expected by backend
- Maintains the correct field order
- Only appends image fields when files are selected
- Sends boolean values as strings ("true"/"false")
- Sends difficulty level as a string

## Recommendations for Backend

### 1. Fix 500 Error
- Add proper error handling for file uploads
- Validate file sizes and types before processing
- Return meaningful error messages instead of generic 500 errors

### 2. Add Request Validation
- Validate required fields before processing
- Return specific error messages for missing/invalid fields
- Handle cases where image fields are not present

### 3. Fix Difficulty Level Response
- Ensure difficulty_level is returned as a number in GET responses
- Check database storage and retrieval of this field

### 4. Improve Error Responses
Instead of generic errors, return structured responses like:
```json
{
  "success": false,
  "error": "Missing required field: subjectName",
  "details": {
    "missingFields": ["subjectName"],
    "invalidFields": []
  }
}
```

## Testing Recommendations

1. Test with small images first (< 100KB)
2. Test without any images to isolate text field issues
3. Add detailed logging on the backend to identify exact failure points
4. Verify database constraints and field types match expected data

## Frontend Workarounds Applied

- Added detailed console logging in development mode
- Improved error messages shown to users
- Updated UI to better match backend expectations
- Only send image fields when files are actually selected

## Next Steps

1. Backend team should add detailed error logging
2. Test endpoint with simple multipart/form-data requests
3. Verify file upload handling middleware is properly configured
4. Check database field types and constraints
