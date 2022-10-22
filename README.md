# Mongez React Localization

A converter for [Mongez Localization](https://github.com/hassanzohdy/mongez-localization) to allow passing jsx element to the translator.

## Installation

`npm i @mongez/react-localization`

OR

`yarn add @mongez/react-localization`

## JSX Converter

This converter will allow you to pass jsx elements to the translator.
Just import the converter and use it as a translator.

```tsx
// src/config/localization.ts

import { jsxConverter } from "@mongez/react-localization";
import { setLocalizationConfigurations } from "@mongez/localization";

setLocalizationConfigurations({
  /**
   * Default locale code
   *
   * @default en
   */
  defaultLocaleCode: "ar",
  /**
   * Fall back locale code
   *
   * @default en
   */
  fallback: "en",
  /**
   * Converter function to convert the placeholder value to jsx element
   */
  converter: jsxConverter,
});
```

## Example of usage

```tsx
import { extend } from '@mongez/localization';

extend("en", {
  minimumOrderPurchase: "Minimum purchase amount for this order is :amount USD",
});

export function RedComponent() {
  return (
    <>
      {trans('minimumOrderPurchase', { amount: <strong style={{color: 'red'}}>12</strong> })}
    </strong>
  )
}
```

## Tests

Run `yarn test` or `npm run test` to run the tests.
