### Comprehensive Documentation for Styler by Liane Cagara

#### Styler Overview:
Styler is a JavaScript utility designed to apply dynamic styling to text content. It allows users to define styling rules and apply them to text strings programmatically. This documentation provides a detailed explanation of the key features and usage guidelines for Styler.

#### Key Features:
- **styled(text, StyleClass)**:
  - Applies styling rules defined in the provided StyleClass to the given text.
  - Parameters:
    - text: The text to be styled.
    - StyleClass: The class containing styling rules.
  - Returns: The styled text.

#### Styling Rules:

- **title** and **content** Fields:
  - Description: The **title** and **content** fields define styling for their respective sections of the text.
  - Properties:
    - **line_top**: 
      - Description: Adds a decorative line at the top of the section.
      - Possible Values: "default", "10chars", "20chars", "hidden", "whiteline".
    - **line_bottom**: 
      - Description: Adds a decorative line at the bottom of the section.
      - Possible Values: "default", "10chars", "20chars", "hidden", "whiteline".
    - **text_font**: 
      - Description: Sets the font style for the text in the section.
      - Possible Values: Any valid font style.
    - **text_kerning**: 
      - Description: Adjusts spacing between characters in the section.
      - Possible Values: Any positive integer.
    - **text_prefix**: 
      - Description: Adds a prefix to the text in the section.
      - Possible Values: Any text string.
    - **text_suffix**: 
      - Description: Adds a suffix to the text in the section.
      - Possible Values: Any text string.
    - **text_trim**: 
      - Description: Trims whitespace from the text in the section.
      - Possible Values: None.

#### Line Properties:
- **line_top** and **line_bottom**:
  - Description: Properties to add decorative lines at the top and bottom of text sections.
  - Possible Values: "default", "10chars", "20chars", "hidden", "whiteline".
- **line_replacer**:
  - Description: Property to replace specified text with a line.
  - Possible Values: Any text string.
- **line_replace**:
  - Description: Property to replace specified text with a line throughout the text.
  - Possible Values: Any text string.
- **line_whiteline**:
  - Description: Property to insert a white line.
  - Possible Values: None.
- **line_inside_text**:
  - Description: Property to create a line with inside text.
  - Possible Values: Your Name!
  - Alternative: **line_inside_text_elegant**

#### Text Properties:
- **text_font**:
  - Description: Property to set the font style for the text.
  - Possible Values: Any valid font style.
- **text_kerning**:
  - Description: Property to adjust spacing between characters in the text.
  - Possible Values: Any positive integer.
- **text_prefix**:
  - Description: Property to add a prefix to the text.
  - Possible Values: Any text string.
- **text_suffix**:
  - Description: Property to add a suffix to the text.
  - Possible Values: Any text string.
- **text_trim**:
  - Description: Property to trim whitespace from the text.
  - Possible Values: None.

### Other Properties:
- **number_font**
  - Description: Property to apply fonts to any numbers.
  - Possible Values: bold.
- **content**
  - Description: Its the content, set it to null if you want to use the dynamically sent text.

#### Example Usage:
```javascript
export class Style {
  title = {
    content: "Example Title",
    line_top: "default",
    line_bottom: "20chars",
    text_font: "bold",
    text_kerning: "5",
    text_prefix: "[",
    text_suffix: "]",
    text_trim: true
  },
  content = {
    content: null,
    line_top: "hidden",
    line_bottom: "default",
    text_font: "fancy",
    text_kerning: "3",
    text_prefix: "",
    text_suffix: "",
    text_trim: false,
    number_font: "bold"
  },
  // Extra fields can be added here
  bottomField = {
    content: "Cool Info",
    line_top: "7chars",
    text_font: "fancy_italic",
    text_kerning: "0"
  }
}
```

### Available Fonts:
* Ｗｉｄｅｓｐａｃｅ - widespace
* 𝐒𝐞𝐫𝐢𝐟 - serif
* 𝓗𝓪𝓷𝓭𝔀𝓻𝓲𝓽𝓲𝓷𝓰 - handwriting
* 𝑺𝒄𝒓𝒊𝒑𝒕𝒃𝒐𝒍𝒅 - scriptbold
* 𝑆𝑐𝑟𝑖𝑝𝑡 - script
* 𝚃𝚢𝚙𝚎𝚠𝚛𝚒𝚝𝚎𝚛 - typewriter
* 𝗕𝗼𝗹𝗱 - bold 
* 𝖥𝖺𝗇𝖼𝗒 - fancy
* 𝐌𝚘𝚘𝚍𝚢 - moody
* None - none
* 𝘽𝙤𝙡𝙙 𝙄𝙩𝙖𝙡𝙞𝙘 - bold_italic
* 𝘍𝘢𝘯𝘤𝘺 𝘐𝘵𝘢𝘭𝘪𝘤 - fancy_italic
* 𝔻𝕠𝕦𝕓𝕝𝕖 𝕊𝕥𝕣𝕦𝕔𝕜 - double_struck

#### In-String fonts:
```
Hello [font=bold]Liane![:font=bold]
```

#### Notes:
- Ensure that the StyleClass provided to the `styled()` function adheres to the specified structure and property names for proper styling application.
- Use appropriate styling properties to achieve the desired text formatting effects for both title and content sections. Additional fields can be utilized to customize the styling further.