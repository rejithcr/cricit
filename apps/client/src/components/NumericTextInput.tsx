import React from 'react';
import { TextInput, TextInputProps } from 'react-native';

export const NumericTextInput: React.FC<TextInputProps> = (props) => {
  const handleChangeText = (text: string) => {
    // Only allow 0-9 characters
    const numericText = text.replace(/[^0-9]/g, '');
    if (props.onChangeText) {
      props.onChangeText(numericText);
    }
  };

  return (
    <TextInput
      {...props}
      keyboardType="number-pad"
      onChangeText={handleChangeText}
    />
  );
};
