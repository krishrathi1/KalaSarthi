# AI Design Generator - Testing Checklist

## Pre-Testing Setup

- [ ] Verify `key.json` exists in project root
- [ ] Confirm Vertex AI API is enabled in Google Cloud Console
- [ ] Check service account has required permissions
- [ ] Ensure `@google-cloud/vertexai` package is installed
- [ ] Verify project builds without errors: `npm run build`

## Authentication & Access

- [ ] Log in as an artisan user
- [ ] Verify "AI Design Generator" button appears on profile page
- [ ] Verify "AI Design Generator" card appears on dashboard
- [ ] Click button/card and navigate to `/ai-design-generator`
- [ ] Verify non-artisan users cannot access the page
- [ ] Verify unauthenticated users are redirected to login

## Product Loading

- [ ] Products load automatically on page load
- [ ] Only published products are shown
- [ ] Only products with images are shown
- [ ] Product grid displays correctly
- [ ] Product images load properly
- [ ] Product names and prices display correctly
- [ ] Empty state shows if no products available

## Product Selection

- [ ] Click on a product to select it
- [ ] Selected product shows blue border
- [ ] Product details display correctly
- [ ] Can switch between products
- [ ] Selection persists when changing styles/colors

## Style Selection

- [ ] All 6 style options are visible
- [ ] Can select a style
- [ ] Selected style shows blue border
- [ ] Style descriptions are clear
- [ ] Default style is "Traditional"
- [ ] Can change style selection

## Color Selection

- [ ] All 10 color options are visible
- [ ] Color swatches display correct colors
- [ ] Can select multiple colors
- [ ] Selected colors show blue border
- [ ] Can deselect colors
- [ ] Counter shows correct number (X/6)
- [ ] Cannot select more than 6 colors
- [ ] Toast notification when trying to select 7th color

## Generation Process

- [ ] "Generate" button is disabled when no colors selected
- [ ] "Generate" button is enabled when colors selected
- [ ] Click "Generate Design Variations" button
- [ ] Loading spinner appears
- [ ] Loading message displays
- [ ] Button is disabled during generation
- [ ] Cannot change selections during generation
- [ ] Generation completes within 30 seconds

## Results Display

- [ ] Generated variations appear in grid
- [ ] Correct number of variations generated
- [ ] Each variation shows the image
- [ ] Color name displays correctly
- [ ] Images are high quality
- [ ] Grid layout is responsive
- [ ] Variations match selected colors

## Download Functionality

- [ ] Download button appears for each variation
- [ ] Click download button
- [ ] File downloads successfully
- [ ] Filename is descriptive (ProductName-Color-variation.png)
- [ ] Downloaded image is correct
- [ ] Can download multiple variations
- [ ] Download works on different browsers

## Error Handling

- [ ] Error message if no product selected
- [ ] Error message if no colors selected
- [ ] Error message if API fails
- [ ] Error message if network issue
- [ ] Toast notifications appear for errors
- [ ] Can retry after error
- [ ] Errors don't crash the page

## Responsive Design

### Desktop (1920x1080)
- [ ] Layout looks good
- [ ] All elements visible
- [ ] Grid displays properly
- [ ] Images load correctly

### Tablet (768x1024)
- [ ] Layout adapts correctly
- [ ] Navigation works
- [ ] Grid adjusts properly
- [ ] Touch interactions work

### Mobile (375x667)
- [ ] Layout is mobile-friendly
- [ ] All features accessible
- [ ] Grid stacks vertically
- [ ] Touch targets are large enough
- [ ] Scrolling works smoothly

## Performance

- [ ] Page loads quickly (< 3 seconds)
- [ ] Product images load efficiently
- [ ] No lag when selecting colors
- [ ] Generation completes in reasonable time
- [ ] No memory leaks
- [ ] Smooth animations

## Browser Compatibility

### Chrome
- [ ] All features work
- [ ] Layout correct
- [ ] Download works

### Firefox
- [ ] All features work
- [ ] Layout correct
- [ ] Download works

### Safari
- [ ] All features work
- [ ] Layout correct
- [ ] Download works

### Edge
- [ ] All features work
- [ ] Layout correct
- [ ] Download works

## API Testing

- [ ] API endpoint responds correctly
- [ ] Request validation works
- [ ] Response format is correct
- [ ] Error responses are proper
- [ ] Rate limiting works (max 6 colors)
- [ ] Authentication is required

## Security Testing

- [ ] Cannot access without authentication
- [ ] Cannot access as non-artisan
- [ ] Cannot see other artisans' products
- [ ] API key is not exposed in client
- [ ] Input validation prevents injection
- [ ] CORS is properly configured

## Edge Cases

- [ ] Artisan with no products
- [ ] Artisan with only draft products
- [ ] Artisan with products but no images
- [ ] Very long product names
- [ ] Very large images
- [ ] Slow network connection
- [ ] API timeout
- [ ] Vertex AI quota exceeded

## Integration Testing

- [ ] Works with existing auth system
- [ ] Fetches products correctly
- [ ] Navigation from profile works
- [ ] Navigation from dashboard works
- [ ] Back button works
- [ ] Logout works properly

## User Experience

- [ ] Instructions are clear
- [ ] Process is intuitive
- [ ] Feedback is immediate
- [ ] Loading states are clear
- [ ] Success messages are helpful
- [ ] Error messages are actionable

## Documentation

- [ ] README is comprehensive
- [ ] Implementation guide is clear
- [ ] User guide is helpful
- [ ] Dev reference is accurate
- [ ] API docs are complete

## Final Checks

- [ ] No console errors
- [ ] No console warnings
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Code is properly formatted
- [ ] All files are committed

## Production Readiness

- [ ] Environment variables set
- [ ] Credentials configured
- [ ] API quotas sufficient
- [ ] Monitoring set up
- [ ] Error tracking enabled
- [ ] Analytics configured
- [ ] Backup plan in place

## Post-Deployment

- [ ] Monitor error rates
- [ ] Check API usage
- [ ] Gather user feedback
- [ ] Track generation success rate
- [ ] Monitor performance metrics
- [ ] Review logs regularly

---

## Testing Notes

**Tester Name**: _______________
**Date**: _______________
**Environment**: _______________
**Browser**: _______________
**Device**: _______________

### Issues Found:
1. 
2. 
3. 

### Suggestions:
1. 
2. 
3. 

### Overall Status:
- [ ] Pass
- [ ] Pass with minor issues
- [ ] Fail - needs fixes

**Signature**: _______________
