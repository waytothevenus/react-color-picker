'use strict';

import React from 'react';
import PropTypes from 'prop-types';

class RGBGradient extends React.Component {
  static propTypes = {
    active: PropTypes.bool.isRequired,
    color: PropTypes.string.isRequired,
    opacityLow: PropTypes.object.isRequired,
    opacityHigh: PropTypes.object.isRequired
  };

  render() {
    const { active, color, opacityLow, opacityHigh } = this.props;
    if (!active) return <noscript />;
    return (
      <div>
        <div className={`cp-gradient cp-rgb cp-${color}-high`} style={opacityHigh} />
        <div className={`cp-gradient cp-rgb cp-${color}-low`} style={opacityLow} />
      </div>
    );
  }
}

export default RGBGradient;
