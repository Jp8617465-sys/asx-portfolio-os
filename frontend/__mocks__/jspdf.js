const mockInstance = {
  addPage: jest.fn(),
  text: jest.fn(),
  setFont: jest.fn(),
  setFontSize: jest.fn(),
  setTextColor: jest.fn(),
  setDrawColor: jest.fn(),
  setFillColor: jest.fn(),
  setPage: jest.fn(),
  line: jest.fn(),
  rect: jest.fn(),
  roundedRect: jest.fn(),
  image: jest.fn(),
  output: jest.fn().mockReturnValue('mock-pdf-content'),
  save: jest.fn(),
  getPageWidth: jest.fn().mockReturnValue(210),
  getPageHeight: jest.fn().mockReturnValue(297),
  internal: {
    getPageHeight: jest.fn().mockReturnValue(297),
    pages: [null, {}], // First element is null, then page objects
    pageSize: {
      getWidth: jest.fn().mockReturnValue(210),
      getHeight: jest.fn().mockReturnValue(297),
    },
  },
};

const jsPDF = jest.fn(() => mockInstance);
jsPDF.prototype = mockInstance;

module.exports = jsPDF;
module.exports.default = jsPDF;
module.exports.__esModule = true;
