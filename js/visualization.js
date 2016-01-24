'use strict';

const LEFT_MARGIN = 30;
const RIGHT_MARGIN = 30;
const BOTTOM_MARGIN = 30;
const TOP_MARGIN = 20;

class Visualization {
  constructor(options) {
    this.highlightedYears = [];
    this.element = options.element;
    this.updateDimensions();
    this.mode = 1;
    this.fetchData();
  }

  updateDimensions() {
    this.containerHeight = $(this.element).height();
    this.containerWidth = $(this.element).width();
    this.height = this.containerHeight - BOTTOM_MARGIN - TOP_MARGIN;
    this.width = this.containerWidth - LEFT_MARGIN - RIGHT_MARGIN;
  }

  setMode(mode) {
    this.mode = mode;
    this.updateChart();
  }

  fetchData() {
    this.dataLoading = new Promise((resolve, reject) => {
      d3.csv('../csv/ipos.csv', (data) => {
        data.forEach((d) => {
          for (var col in d) { d[col] = Number(d[col]); }
        });
        this.data = data;
        var counts = data.map((d) => d['total_ipos']);
        this.maxCount = Math.ceil(Math.max(...counts) / 100) * 100;
        var years = this.data.map((d) => d['year']);
        this.minYear = Math.min(...years);
        this.maxYear = Math.max(...years);
        resolve();
      });
    });
  }

  initChart() {
    d3.select(this.element).selectAll('svg').remove();

    var svg = d3.select(this.element).append('svg')
      .attr('width', this.containerWidth)
      .attr('height', this.containerHeight);

    svg.append('g')
      .attr('class', 'axis y-axis left-axis');

    svg.append('g')
      .attr('class', 'axis y-axis right-axis');

    svg.append('g')
      .attr('class', 'axis x-axis bottom-axis');

    svg.append('g')
      .attr('class', 'bars-container');

    svg.append('g')
      .attr('class', 'lines-container');
  }

  getBottomScale() {
    return d3.time.scale()
      .domain([new Date(this.minYear - 1, 7, 1), new Date(this.maxYear, 7, 1)])
      .range([0, this.width]);
  }

  getLeftScale() {
    return d3.scale.linear()
      .domain([0, this.maxCount])
      .range([0, this.height]);
  }

  getRightScale() {
    return d3.scale.linear()
      .domain([0, 1.5])
      .range([0, this.height]);
  }

  getDefaultAxis() {
    return d3.svg.axis()
      .innerTickSize(5)
      .outerTickSize(1)
      .tickPadding(5);
  }

  getBottomAxis() {
    return this.getDefaultAxis()
      .scale(this.getBottomScale())
      .ticks(d3.time.years, 5)
      .outerTickSize(0);
  }

  getLeftAxis() {
    return this.getDefaultAxis()
      .scale(this.getLeftScale().range([this.height, 0]))
      .orient('left');
  }

  getRightAxis() {
    return this.getDefaultAxis()
      .scale(this.getRightScale().range([this.height, 0]))
      .orient('right');
  }

  getLine(fieldName, scale) {
    var x = this.getBottomScale();
    var leftOffset = LEFT_MARGIN;

    var y = scale;
    var topOffset = this.height + TOP_MARGIN;

    return d3.svg.line()
      .interpolate('linear')
      .x((d) => leftOffset + x(new Date(d['year'], 1, 1)))
      .y((d) => topOffset - y(d[fieldName]));
  }

  getBarWidth() {
    var x = this.getBottomScale();
    var width = x(new Date(2003, 1, 1)) - x(new Date(2002, 1, 1));
    return width * 0.8;
  }

  updateAxes() {
    var svg = d3.select(this.element).select('svg');
    var topOffset = this.height + TOP_MARGIN;
    var rightOffset = this.width + LEFT_MARGIN;

    svg
      .attr('width', this.containerWidth)
      .attr('height', this.containerHeight);

    svg.select('g.bottom-axis')
      .attr('transform', 'translate(' + LEFT_MARGIN + ',' + topOffset + ')')
      .transition()
      .ease('sin-in-out')
      .call(this.getBottomAxis());
    svg.select('g.right-axis')
      .attr('transform', 'translate(' + rightOffset + ',' + TOP_MARGIN + ')')
      .attr('visibility', this.mode !== 1 ? 'visible' : 'hidden')
      .transition()
      .ease('sin-in-out')
      .call(this.getRightAxis());
    svg.select('g.left-axis')
      .attr('transform', 'translate(' + LEFT_MARGIN + ',' + TOP_MARGIN + ')')
      .attr('visibility', this.mode !== 2 ? 'visible' : 'hidden')
      .transition()
      .ease('sin-in-out')
      .call(this.getLeftAxis());
  }

  updateBars(columns, columnsEnter, name, show) {
    var fieldName = name + '_ipos';
    var barClassName = 'bar-' + name;
    var labelClassName = 'label-' + name;
    var width = this.getBarWidth();
    var x = this.getBottomScale();
    var leftOffset = LEFT_MARGIN - width/2;

    var y = this.getLeftScale();
    var topOffset = this.height + TOP_MARGIN;

    var barsInitialState = (bar) => {
      return bar
        .attr('class', barClassName)
        .attr('width', width)
        .attr('x', (d) => leftOffset + x(new Date(d['year'], 1, 1)))
        .attr('height', 0)
        .attr('y', topOffset);
    }

    var labelsInitialState = (label) => {
      return label
        .attr('class', 'label ' + labelClassName)
        .attr('height', 0)
        .attr('x', (d) => leftOffset + x(new Date(d['year'], 1, 1)) + width / 2)
        .attr('y', topOffset)
        .attr('text-anchor', 'middle')
        .text((d) => d[fieldName]);
    }

    columnsEnter.append('rect')
      .call(barsInitialState);

    columnsEnter.append('text')
      .call(labelsInitialState);

    var bars = columns.selectAll('rect.' + barClassName);
    var labels = columns.selectAll('text.' + labelClassName);

    if (!show) {
      bars.transition()
        .call(barsInitialState)
        .attr('opacity', 0);
      labels.transition()
        .call(labelsInitialState)
        .attr('visibility', 'hidden');
      return;
    }

    bars.transition()
      .attr('height', (d) => y(d[fieldName]))
      .attr('width', width)
      .attr('x', (d) => leftOffset + x(new Date(d['year'], 1, 1)))
      .attr('y', (d) => topOffset - y(d[fieldName]))
      .attr('opacity', 1.0);

    labels.transition()
      .attr('x', (d) => leftOffset + x(new Date(d['year'], 1, 1)) + width / 2)
      .attr('y', (d) => topOffset - 2 - y(d[fieldName]))
      .attr('visibility', 'visible');
  }

  updateColumns() {
    var svg = d3.select(this.element).select('svg');
    var container = svg.select('g.bars-container');

    var columns = container.selectAll('.column')
      .data(this.data, (d) => d['year']);

    var columnsEnter = columns.enter().append('g')
      .attr('class', 'column')
      .attr('opacity', 0);

    columns.exit().remove();

    columns.transition()
      .attr('opacity', (d) => {
        if (this.mode === 3) {
          return 0.3;
        }
        if (this.highlightedYears.length === 0) {
          return 1.0;
        } else {
          return this.highlightedYears.indexOf(d['year']) === -1 ? 0.3 : 1.0;
        }
      });

    this.updateBars(columns, columnsEnter, 'total', this.mode === 1 || this.mode === 4);
    this.updateBars(columns, columnsEnter, 'tech', this.mode !== 2);
    this.updateBars(columns, columnsEnter, 'profitable_tech', this.mode === 4);
  }

  // display: [true, false, 'moveDown']
  updateLine(fieldName, className, scale, display) {
    var svg = d3.select(this.element).select('svg');
    var container = svg.select('g.lines-container');

    var path = container.select('path.' + className)
      .datum(this.data, (d) => d['year']);

    if (!display) {
      path.transition()
        .attr('opacity', 0)
        .remove();
      return;
    }

    if (display === 'moveDown') {
      path.attr('stroke-dashoffset', 0);

      path.transition()
        .attr('d', this.getLine('baseline', scale));

      path.transition()
        .delay(500)
        .attr('opacity', 0);
      return;
    }

    if (path.empty()) {
      path = container.append('path')
        .datum(this.data)
        .attr('class', 'line ' + className)
        .attr('d', this.getLine(fieldName, scale));

      var totalLength = path.node().getTotalLength();
      path
        .attr('stroke-dasharray', totalLength + ' ' + totalLength)
        .attr('stroke-dashoffset', totalLength);

      path.transition()
        .duration(1000)
        .attr('stroke-dashoffset', 0);
    } else {
      path.transition()
        .attr('opacity', 1.0)
        .attr('d', this.getLine(fieldName, scale));
    }
  }

  updateProfitLine(name, display) {
    var fieldName = name + '_profitable';
    var className = 'line-' + name;
    var scale = this.getRightScale();
    this.updateLine(fieldName, className, scale, display);
  }

  updateCountLine(name, display) {
    var fieldName = name + '_ipos';
    var className = 'line-' + name + '-ipos';
    var scale = this.getLeftScale();
    this.updateLine(fieldName, className, scale, display);
  }

  updateLines() {
    this.updateProfitLine('other', this.mode === 2);
    this.updateProfitLine('tech', this.mode === 4 ? 'moveDown' : this.mode !== 1);
    this.updateCountLine('tech', this.mode === 3);
  }

  updateChart() {
    this.updateAxes();
    this.updateColumns();
    this.updateLines();
  }

  enableHighlight(years) {
    this.highlightedYears = years;
    this.updateChart();
  }

  disableHighlight() {
    this.highlightedYears = [];
    this.updateChart();
  }

  render() {
    this.dataLoading.then(() => {
      this.initChart();
      this.updateChart();
      $(window).resize(() => {
        this.updateDimensions();
        this.updateChart();
      })
    });
  }
}