import React from 'react';
import ControlSelect from '@mapbox/mr-ui/control-select';
import CopyButton from '@mapbox/mr-ui/copy-button';
import Tooltip from '@mapbox/mr-ui/tooltip';
import Icon from '@mapbox/mr-ui/icon';
import { XYInput } from './components/xy-input';
import { SliderInput } from './components/slider-input';
import { NumberInput } from './components/number-input';
import { EyedropperInput } from './components/eyedropper-input';
import colorString from 'color-string';
import themeable from 'react-themeable';
import { defaultTheme } from './theme';
import { autokey } from './autokey';
import { rgb2hsl, rgb2hex, hsl2rgb, getColor, isDark } from './colorfunc';

const tooltipProps = {
  coloring: 'dark',
  textSize: 'xs'
};

type ColorSpace = 'hsl' | 'rgb' | 'hex';
type Mode = 'disc' | 'values';

interface ConfigObject {
  name: string;
  value: number;
  max: number;
  displayValue: string;
  trackBackground: string;
  onChange: (v: number) => void;
}

interface Color {
  h: number;
  s: number;
  l: number;
  r: number;
  g: number;
  b: number;
  a: number;
  hex: string;
}

interface OnChange extends Color {
  colorSpace: ColorSpace;
  mode: Mode;
}

interface Props {
  onChange: (color: OnChange) => void;
  theme?: { [key: string]: string };
  mode?: Mode;
  colorSpace?: ColorSpace;
  initialValue?: string;
  discRadius?: number;
  eyedropper?: boolean;
  reset?: boolean;
  alpha?: boolean;
  readOnly?: boolean;
  mounted?: (constructor: ColorPickr) => void;
}

interface State {
  mode: Mode;
  colorSpace: ColorSpace;
  initialValue: Color;
  interimValue: string;
  color: Color;
}

class ColorPickr extends React.Component<Props, State> {
  static defaultProps = {
    initialValue: '#000',
    discRadius: 18,
    alpha: true,
    eyedropper: true,
    reset: true,
    mode: 'disc',
    colorSpace: 'hex',
    theme: {},
    readOnly: false
  };

  assignColor(v: string) {
    const { alpha } = this.props;
    let color = getColor(v);
    if (!alpha && color.a < 1) {
      console.warn(
        `[ColorPickr] ${v} contains an alpha channel "${color.a}" but alpha is set to "false". Resetting to "1".`
      );
      color = { ...color, ...{ a: 1 } };
    }

    return color;
  }

  constructor(props: Props) {
    super(props);
    const { mode, colorSpace, initialValue } = props;
    const color = this.assignColor(initialValue);

    this.state = {
      mode,
      initialValue: color,
      interimValue: null,
      colorSpace,
      color
    };
  }

  componentDidMount() {
    const { mounted } = this.props;
    if (mounted) {
      mounted(this);
    }
  }

  overrideValue = (
    cssColor: 'string',
    shouldUpdateInitialValue: boolean,
    emitOnChange = true
  ) => {
    const color = this.assignColor(cssColor);
    const cb = () => emitOnChange && this.emitOnChange();
    if (shouldUpdateInitialValue) {
      this.setState({ color, initialValue: color }, cb);
    } else {
      this.setState({ color }, cb);
    }
  };

  emitOnChange = () => {
    const { color, mode, colorSpace } = this.state;
    this.props.onChange({ mode, colorSpace, ...color });
  };

  setNextColor = (obj: Color) => {
    const { color } = this.state;
    this.setState(
      {
        color: { ...color, ...obj }
      },
      this.emitOnChange
    );
  };

  changeHSL = (channels: {
    h?: number;
    s?: number;
    l?: number;
    a?: number;
  }) => {
    const { color } = this.state;
    const nextColor = { ...color, ...channels };
    const { h, s, l } = nextColor;
    const rgb = hsl2rgb(h, s, l);
    const hex = rgb2hex(rgb.r, rgb.g, rgb.b);
    this.setNextColor({ ...nextColor, ...rgb, ...{ hex } });
  };

  onXYChange = ({ x, y }: { x: number; y: number }) => {
    this.changeHSL({
      s: Math.round(x),
      l: 100 - Math.round(y)
    });
  };

  changeRGB = (channels: {
    r?: number;
    g?: number;
    b?: number;
    a?: number;
  }) => {
    const { color } = this.state;
    const nextColor = { ...color, ...channels };
    const { r, g, b } = nextColor;
    const hsl = rgb2hsl(r, g, b);
    const hex = rgb2hex(r, g, b);
    this.setNextColor({ ...nextColor, ...hsl, ...{ hex } });
  };

  getColorSpaceOutput = () => {
    const { colorSpace, color } = this.state;
    const { h, s, l, a, r, g, b, hex } = color;
    switch (colorSpace) {
      case 'hex':
        return `#${hex}`;
      case 'hsl':
        return a < 1
          ? `hsla(${h}, ${s}%, ${l}%, ${a})`
          : `hsl(${h}, ${s}%, ${l}%)`;
      case 'rgb':
        return a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
    }
  };

  changeColor = (value: string) => {
    const result = colorString.get(value) || colorString.get(`#${value}`);
    if (result) {
      const { model, value } = result;
      switch (model) {
        case 'hsl':
        case 'hwb':
          return this.changeHSL({
            h: value[0],
            s: value[1],
            l: value[2],
            a: value[3]
          });
        case 'rgb':
          return this.changeRGB({
            r: value[0],
            g: value[1],
            b: value[2],
            a: value[3]
          });
      }
    }
  };

  reset = () => {
    const { initialValue } = this.state;
    this.setState({ color: initialValue }, this.emitOnChange);
  };

  setMode = (mode: Mode) => {
    this.setState({ mode });
  };

  setColorSpace = (colorSpace: ColorSpace) => {
    this.setState({ colorSpace }, this.emitOnChange);
  };

  getColorCoords = () => {
    const { color } = this.state;
    return {
      xmax: 100,
      ymax: 100,
      x: color.s,
      y: 100 - color.l
    };
  };

  render() {
    const {
      color,
      mode,
      colorSpace,
      initialValue: i,
      interimValue
    } = this.state;
    const { r, g, b, h, s, l, hex } = color;
    const { theme, readOnly, reset, alpha, discRadius, eyedropper } =
      this.props;
    const a = Math.round(color.a * 100);
    const themeObject = { ...defaultTheme, ...theme };

    if (!readOnly) {
      themeObject.numberInput = `${themeObject.numberInput} bg-white`;
    } else {
      themeObject.xyControlContainer = `${themeObject.xyControlContainer} events-none`;
    }

    const themer = autokey(themeable(themeObject));

    const rgbBackground = `rgb(${r},${g},${b})`;
    const rgbaBackground = `rgba(${r},${g},${b},${color.a})`;
    const hueBackground = `hsl(${h}, 100%, 50%)`;
    const saturationBackground = `hsl(${h},${s}%,50%)`;
    const lightnessBackground = `hsl(${h},100%,${l}%)`;
    const redLowBackground = `rgb(0, ${g},${b})`;
    const redHighBackground = `rgb(255,${g},${b})`;
    const greenLowBackground = `rgb(${r},0,${b})`;
    const greenHighBackground = `rgb(${r},255,${b})`;
    const blueLowBackground = `rgb(${r},${g},0)`;
    const blueHighBackground = `rgb(${r},${g},255)`;

    const configuration: { [channel: string]: ConfigObject } = {
      h: {
        name: 'Hue',
        value: h,
        max: 360,
        displayValue: hueBackground,
        trackBackground: `linear-gradient(
          to left,
          #ff0000 0%,
          #ff0099 10%,
          #cd00ff 20%,
          #3200ff 30%,
          #0066ff 40%,
          #00fffd 50%,
          #00ff66 60%,
          #35ff00 70%,
          #cdff00 80%,
          #ff9900 90%,
          #ff0000 100%
        `,
        onChange: (v: number) => this.changeHSL({ h: v })
      },
      s: {
        name: 'Saturation',
        value: s,
        max: 100,
        displayValue: saturationBackground,
        trackBackground: `linear-gradient(to left, ${hueBackground} 0%, #bbb 100%)`,
        onChange: (v: number) => this.changeHSL({ s: v })
      },
      l: {
        name: 'Lightness',
        value: l,
        max: 100,
        displayValue: lightnessBackground,
        trackBackground: `linear-gradient(to left, #fff 0%, ${hueBackground} 50%, #000 100%)`,
        onChange: (v: number) => this.changeHSL({ l: v })
      },
      r: {
        name: 'Red',
        value: r,
        max: 255,
        displayValue: rgbBackground,
        trackBackground: `linear-gradient(to left, ${redHighBackground} 0%, ${redLowBackground} 100%)`,
        onChange: (v: number) => this.changeRGB({ r: v })
      },
      g: {
        name: 'Green',
        value: g,
        max: 255,
        displayValue: rgbBackground,
        trackBackground: `linear-gradient(to left, ${greenHighBackground} 0%, ${greenLowBackground} 100%)`,
        onChange: (v: number) => this.changeRGB({ g: v })
      },
      b: {
        name: 'Blue',
        value: b,
        max: 255,
        displayValue: rgbBackground,
        trackBackground: `linear-gradient(to left, ${blueHighBackground} 0%, ${blueLowBackground} 100%)`,
        onChange: (v: number) => this.changeRGB({ b: v })
      },
      a: {
        name: 'Alpha',
        value: a,
        max: 100,
        displayValue: `hsla(${h},${s}%,${l}%,${color.a})`,
        trackBackground: `linear-gradient(to left, ${rgbBackground} 0%, rgba(${r},${g},${b},0) 100%)`,
        onChange: (v: number) => this.changeHSL({ a: v / 100 })
      }
    };

    const discUI = (
      <>
        <div {...themer('gradientContainer')}>
          <XYInput
            {...this.getColorCoords()}
            isDark={isDark([r, g, b])}
            backgroundColor={`#${hex}`}
            discRadius={discRadius}
            theme={{
              xyControlContainer: themeObject.xyControlContainer,
              xyControl: themeObject.xyControl,
              xyControlDark: themeObject.xyControlDark,
              xyControlDisabled: themeObject.xyControlDisabled
            }}
            disabled={readOnly}
            onChange={this.onXYChange}
          >
            <div
              {...themer('gradient')}
              style={{ background: hueBackground }}
            />
            <div {...themer('gradient', 'gradientHue')} />
          </XYInput>
        </div>
        <div {...themer('sliderContainer')}>
          <SliderInput
            id="hue"
            trackStyle={{ background: configuration.h.trackBackground }}
            min={0}
            max={configuration.h.max}
            value={h}
            colorValue={configuration.h.displayValue}
            disabled={readOnly}
            onChange={configuration.h.onChange}
          />
          {alpha && (
            <SliderInput
              id="alpha"
              trackStyle={{ background: configuration.a.trackBackground }}
              min={0}
              max={configuration.a.max}
              value={a}
              colorValue={configuration.a.displayValue}
              disabled={readOnly}
              onChange={configuration.a.onChange}
            />
          )}
        </div>
      </>
    );

    const renderValues = (channel: string, index: number) => {
      const { name, value, max, displayValue, trackBackground, onChange } =
        configuration[channel] as ConfigObject;
      return (
        <div {...themer('valuesMode')} key={index}>
          <span title={name} {...themer('valuesModeLabel')}>
            {channel}
          </span>
          <div {...themer('valuesModeSlider')}>
            <SliderInput
              id={channel}
              trackStyle={{ background: trackBackground }}
              min={0}
              max={max}
              value={value}
              colorValue={displayValue}
              disabled={readOnly}
              onChange={onChange}
            />
          </div>
          <div {...themer('valuesModeInput')}>
            <NumberInput
              id={channel}
              min={0}
              max={max}
              value={value}
              theme={{
                numberInput: themeObject.numberInput
              }}
              onChange={onChange}
              readOnly={readOnly}
            />
          </div>
        </div>
      );
    };

    const valuesUI = (
      <div {...themer('valuesModeContainer')}>
        <div {...themer('valuesModeGroup')}>
          {['h', 's', 'l'].map(renderValues)}
        </div>
        <div {...themer('valuesModeGroup')}>
          {['r', 'g', 'b'].map(renderValues)}
        </div>
        {alpha && (
          <div {...themer('valuesModeGroup')}>{['a'].map(renderValues)}</div>
        )}
      </div>
    );

    let resetButton = (
      <button
        {...themer('swatch')}
        {...(readOnly ? { disabled: true, 'aria-disabled': true } : {})}
        aria-label="Reset color"
        data-testid="color-reset"
        type="button"
        style={{
          backgroundColor: `rgba(${i.r}, ${i.g}, ${i.b}, ${i.a})`
        }}
        onClick={this.reset}
      >
        {!readOnly && <Icon name="undo" inline={true} />}
      </button>
    );

    if (!readOnly) {
      resetButton = (
        <Tooltip {...tooltipProps} content="Reset">
          {resetButton}
        </Tooltip>
      );
    }

    const copySupported = !readOnly && CopyButton.isCopySupported();
    let copyButton = (
      <div {...themer('swatch')} style={{ backgroundColor: rgbaBackground }} />
    );

    if (copySupported) {
      copyButton = (
        <CopyButton
          text={this.getColorSpaceOutput()}
          block={true}
          tooltipColoring={tooltipProps.coloring}
          tooltipTextSize={tooltipProps.textSize}
        >
          <button
            {...themer('swatch')}
            {...(readOnly ? { disabled: true, 'aria-disabled': true } : {})}
            aria-label="Copy color"
            data-testid="color-copy"
            type="button"
            {...themer('swatch')}
            style={{ backgroundColor: rgbaBackground }}
          >
            <Icon name="clipboard" inline={true} />
          </button>
        </CopyButton>
      );
    }

    return (
      <div {...themer('container')}>
        <div {...themer('controlsContainer')}>
          <div {...themer('modesContainer')}>
            <Tooltip {...tooltipProps} content="Disc">
              <button
                {...themer('modeToggle', mode === 'disc' && 'modeToggleActive')}
                data-testid="mode-disc"
                onClick={() => this.setMode('disc')}
                type="button"
              >
                <Icon name="circle" />
              </button>
            </Tooltip>
            <Tooltip {...tooltipProps} content="Values">
              <button
                {...themer(
                  'modeToggle',
                  mode === 'values' && 'modeToggleActive'
                )}
                data-testid="mode-values"
                onClick={() => this.setMode('values')}
                type="button"
              >
                <Icon name="boolean" />
              </button>
            </Tooltip>
          </div>
          {eyedropper && 'EyeDropper' in window && (
            <Tooltip {...tooltipProps} content="Pick color">
              <div>
                <EyedropperInput
                  disabled={readOnly}
                  onChange={this.changeColor}
                  theme={{
                    eyeDropper: themeObject.eyeDropper,
                    eyeDropperIcon: themeObject.eyeDropperIcon
                  }}
                />
              </div>
            </Tooltip>
          )}
        </div>
        {mode === 'disc' && discUI}
        {mode === 'values' && valuesUI}
        <div {...themer('modeInputContainer')}>
          <div {...themer('colorSpaceContainer')}>
            <ControlSelect
              id="colorspace"
              value={colorSpace}
              themeControlWrapper="w-full"
              themeControlSelectContainer={
                themeObject.colorSpaceSelectContainer
              }
              themeControlSelect={themeObject.colorSpaceSelect}
              onChange={this.setColorSpace}
              options={[
                {
                  label: color.a < 1 ? 'HSLA' : 'HSL',
                  value: 'hsl'
                },
                {
                  label: color.a < 1 ? 'RGBA' : 'RGB',
                  value: 'rgb'
                },
                {
                  label: 'HEX',
                  value: 'hex'
                }
              ]}
            />
          </div>
          <div {...themer('colorInputContainer')}>
            <input
              {...(readOnly ? { readOnly: true } : {})}
              {...themer('numberInput')}
              data-testid="color-input"
              value={interimValue || this.getColorSpaceOutput()}
              onChange={(e) => {
                this.setState({ interimValue: e.target.value });
                this.changeColor(e.target.value);
              }}
              onBlur={() => this.setState({ interimValue: null })}
              type="text"
            />
          </div>
        </div>
        <div {...themer('swatchCompareContainer')}>
          {reset && (
            <div {...themer('tileBackground', 'currentSwatchContainer')}>
              {resetButton}
            </div>
          )}
          <div {...themer('tileBackground', 'newSwatchContainer')}>
            {copyButton}
          </div>
        </div>
      </div>
    );
  }
}

export default ColorPickr;
