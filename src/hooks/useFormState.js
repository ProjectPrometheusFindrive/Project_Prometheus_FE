import { useState, useCallback, useEffect, useRef } from "react";

// Simple deep equality for plain objects/arrays/primitives
const deepEqual = (a, b) => {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (a == null || b == null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === "object" && typeof b === "object") {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
};

/**
 * Custom hook for form state management
 * @param {Object} initialValues - Initial form values
 * @param {Object} options - Configuration options
 * @param {Function} options.onSubmit - Submit handler function
 * @param {Function} options.validate - Validation function
 * @param {boolean} options.validateOnChange - Whether to validate on each change
 * @returns {Object} Form state and methods
 */
const useFormState = (initialValues = {}, options = {}) => {
  const { onSubmit, validate, validateOnChange = false, syncOnInitialChange = true } = options;
  
  const [form, setForm] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update a single field
  const updateField = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Mark field as touched
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Validate on change if enabled
    if (validateOnChange && validate) {
      const newForm = { ...form, [field]: value };
      const fieldErrors = validate(newForm);
      setErrors(prev => ({ ...prev, [field]: fieldErrors[field] }));
    }
  }, [form, validate, validateOnChange]);

  // Update multiple fields at once
  const updateFields = useCallback((updates) => {
    setForm(prev => ({ ...prev, ...updates }));
    
    // Mark updated fields as touched
    const touchedFields = Object.keys(updates).reduce((acc, field) => {
      acc[field] = true;
      return acc;
    }, {});
    setTouched(prev => ({ ...prev, ...touchedFields }));
  }, []);

  // Reset form to initial values
  const resetForm = useCallback((newInitialValues) => {
    const resetValues = newInitialValues || initialValues;
    setForm(resetValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Set form values (useful for editing existing data)
  const setFormValues = useCallback((values) => {
    setForm(values);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    if (e) {
      e.preventDefault();
    }

    // Mark all fields as touched
    const allTouched = Object.keys(form).reduce((acc, field) => {
      acc[field] = true;
      return acc;
    }, {});
    setTouched(allTouched);

    // Validate if validator provided
    if (validate) {
      const validationErrors = validate(form);
      setErrors(validationErrors);
      
      // Don't submit if there are errors
      if (Object.keys(validationErrors).length > 0) {
        return false;
      }
    }

    // Submit the form
    if (onSubmit) {
      setIsSubmitting(true);
      try {
        await onSubmit(form);
        return true;
      } catch (error) {
        console.error('Form submission error:', error);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    }
    
    return true;
  }, [form, validate, onSubmit]);

  // Check if form has been modified
  const isDirty = useCallback(() => {
    return JSON.stringify(form) !== JSON.stringify(initialValues);
  }, [form, initialValues]);

  // Check if form is valid (no errors)
  const isValid = useCallback(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  // Get error for a specific field
  const getFieldError = useCallback((field) => {
    return touched[field] ? errors[field] : undefined;
  }, [errors, touched]);

  // Check if field has error
  const hasFieldError = useCallback((field) => {
    return touched[field] && !!errors[field];
  }, [errors, touched]);

  // Handle field blur (mark as touched)
  const handleFieldBlur = useCallback((field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Validate on blur if validator provided
    if (validate) {
      const validationErrors = validate(form);
      setErrors(prev => ({ ...prev, [field]: validationErrors[field] }));
    }
  }, [form, validate]);

  // Track last applied initial values to detect real changes from caller
  const lastInitialRef = useRef(initialValues);

  // Update form when caller's initial values actually change
  useEffect(() => {
    if (!syncOnInitialChange) return;
    if (!initialValues) return;
    // Only sync when the provided initialValues object meaningfully changed
    if (!deepEqual(lastInitialRef.current, initialValues)) {
      lastInitialRef.current = initialValues;
      setForm(initialValues);
    }
  }, [initialValues, syncOnInitialChange]);

  // Legacy compatibility: provide 'update' function for existing components
  const update = updateField;

  return {
    // Form state
    form,
    errors,
    touched,
    isSubmitting,
    
    // Form methods
    updateField,
    update, // Legacy compatibility
    updateFields,
    resetForm,
    setFormValues,
    handleSubmit,
    
    // Field methods
    getFieldError,
    hasFieldError,
    handleFieldBlur,
    
    // Form status
    isDirty: isDirty(),
    isValid: isValid(),
    
    // Utility methods
    setForm, // Direct access to setter if needed
    setErrors,
    setTouched
  };
};

export default useFormState;
