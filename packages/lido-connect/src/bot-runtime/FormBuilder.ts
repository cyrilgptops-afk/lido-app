import type { BotContext, FormDefinition, FormField } from './context';

/**
 * Form Builder Helper
 * 
 * Fluent API for building dynamic forms
 */
export class FormBuilder {
  private context: BotContext;
  private form: FormDefinition;

  constructor(context: BotContext) {
    this.context = context;
    this.form = {
      title: '',
      fields: [],
      submitLabel: 'Submit',
      cancelLabel: 'Cancel',
    };
  }

  /**
   * Set form title
   */
  setTitle(title: string): this {
    this.form.title = title;
    return this;
  }

  /**
   * Add text field
   */
  addTextField(
    name: string,
    label: string,
    options: Partial<FormField> = {}
  ): this {
    this.form.fields.push({
      name,
      label,
      type: 'text',
      ...options,
    });
    return this;
  }

  /**
   * Add email field
   */
  addEmailField(
    name: string,
    label: string,
    options: Partial<FormField> = {}
  ): this {
    this.form.fields.push({
      name,
      label,
      type: 'email',
      validation: {
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        ...options.validation,
      },
      ...options,
    });
    return this;
  }

  /**
   * Add number field
   */
  addNumberField(
    name: string,
    label: string,
    options: Partial<FormField> = {}
  ): this {
    this.form.fields.push({
      name,
      label,
      type: 'number',
      ...options,
    });
    return this;
  }

  /**
   * Add select/dropdown field
   */
  addSelectField(
    name: string,
    label: string,
    options: Array<{ label: string; value: string }>,
    fieldOptions: Partial<FormField> = {}
  ): this {
    this.form.fields.push({
      name,
      label,
      type: 'select',
      options,
      ...fieldOptions,
    });
    return this;
  }

  /**
   * Add textarea field
   */
  addTextArea(
    name: string,
    label: string,
    options: Partial<FormField> = {}
  ): this {
    this.form.fields.push({
      name,
      label,
      type: 'textarea',
      ...options,
    });
    return this;
  }

  /**
   * Add date field
   */
  addDateField(
    name: string,
    label: string,
    options: Partial<FormField> = {}
  ): this {
    this.form.fields.push({
      name,
      label,
      type: 'date',
      ...options,
    });
    return this;
  }

  /**
   * Add checkbox field
   */
  addCheckbox(
    name: string,
    label: string,
    options: Partial<FormField> = {}
  ): this {
    this.form.fields.push({
      name,
      label,
      type: 'checkbox',
      ...options,
    });
    return this;
  }

  /**
   * Set submit button label
   */
  setSubmitLabel(label: string): this {
    this.form.submitLabel = label;
    return this;
  }

  /**
   * Set cancel button label
   */
  setCancelLabel(label: string): this {
    this.form.cancelLabel = label;
    return this;
  }

  /**
   * Build and return the form definition
   */
  build(): FormDefinition {
    if (!this.form.title) {
      throw new Error('Form title is required');
    }
    if (this.form.fields.length === 0) {
      throw new Error('Form must have at least one field');
    }
    return this.form;
  }
}
