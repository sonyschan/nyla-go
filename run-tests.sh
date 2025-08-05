#!/bin/bash

# NYLA Go Functional Test Runner
# This script runs comprehensive functional tests for both PWA and Extension

set -e

echo "🧪 NYLA Go Functional Test Suite"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js to run tests."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm to run tests."
    exit 1
fi

# Check if Python is available for PWA server
if ! command -v python3 &> /dev/null; then
    print_warning "Python3 is not available. PWA tests may fail."
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing test dependencies..."
    npm install
fi

# Install Playwright browsers if needed
print_status "Ensuring Playwright browsers are installed..."
npx playwright install --with-deps

# Create test results directory
mkdir -p test-results/screenshots

# Parse command line arguments
TESTS_TO_RUN="all"
HEADED=false
DEBUG=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --pwa-only)
            TESTS_TO_RUN="pwa"
            shift
            ;;
        --extension-only)
            TESTS_TO_RUN="extension"
            shift
            ;;
        --headed)
            HEADED=true
            shift
            ;;
        --debug)
            DEBUG=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --pwa-only        Run PWA tests only"
            echo "  --extension-only  Run Extension tests only"
            echo "  --headed          Run tests in headed mode (visible browser)"
            echo "  --debug           Run tests in debug mode"
            echo "  --help           Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                    # Run all tests"
            echo "  $0 --pwa-only         # Run only PWA tests"
            echo "  $0 --headed           # Run all tests with visible browser"
            echo "  $0 --debug --pwa-only # Debug PWA tests"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            print_status "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Build test command
PLAYWRIGHT_CMD="npx playwright test"

if [ "$HEADED" = true ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --headed"
fi

if [ "$DEBUG" = true ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --debug"
fi

# Function to run tests
run_tests() {
    local test_type=$1
    local test_path=$2
    
    print_status "Running $test_type tests..."
    
    if eval "$PLAYWRIGHT_CMD $test_path"; then
        print_success "$test_type tests completed successfully!"
        return 0
    else
        print_error "$test_type tests failed!"
        return 1
    fi
}

# Check if PWA server is needed and available
start_pwa_server() {
    if [ "$TESTS_TO_RUN" = "pwa" ] || [ "$TESTS_TO_RUN" = "all" ]; then
        print_status "Checking if PWA server is running on port 3000..."
        
        if curl -s "http://localhost:3000" > /dev/null 2>&1; then
            print_success "PWA server is already running on port 3000"
        else
            print_status "Starting PWA server..."
            print_warning "PWA server will be managed by Playwright configuration"
        fi
    fi
}

# Pre-flight checks
print_status "Running pre-flight checks..."

# Check if PWA files exist
if [ ! -f "pwa/index.html" ]; then
    print_error "PWA files not found. Please ensure you're running from the project root."
    exit 1
fi

# Check if Extension files exist
if [ ! -f "manifest.json" ]; then
    print_error "Extension manifest.json not found. Please ensure you're running from the project root."
    exit 1
fi

print_success "Pre-flight checks passed!"

# Start PWA server check
start_pwa_server

# Track test results
PWA_RESULT=0
EXTENSION_RESULT=0

# Run tests based on selection
print_status "Starting test execution..."

case $TESTS_TO_RUN in
    "pwa")
        run_tests "PWA" "tests/pwa/"
        PWA_RESULT=$?
        ;;
    "extension")
        run_tests "Extension" "tests/extension/"
        EXTENSION_RESULT=$?
        ;;
    "all")
        print_status "Running comprehensive test suite..."
        
        # Run PWA tests
        run_tests "PWA" "tests/pwa/"
        PWA_RESULT=$?
        
        # Run Extension tests
        run_tests "Extension" "tests/extension/"
        EXTENSION_RESULT=$?
        ;;
esac

# Generate test report
echo ""
echo "🎯 Test Results Summary"
echo "======================="

if [ "$TESTS_TO_RUN" = "pwa" ] || [ "$TESTS_TO_RUN" = "all" ]; then
    if [ $PWA_RESULT -eq 0 ]; then
        print_success "PWA Tests: PASSED ✅"
    else
        print_error "PWA Tests: FAILED ❌"
    fi
fi

if [ "$TESTS_TO_RUN" = "extension" ] || [ "$TESTS_TO_RUN" = "all" ]; then
    if [ $EXTENSION_RESULT -eq 0 ]; then
        print_success "Extension Tests: PASSED ✅"
    else
        print_error "Extension Tests: FAILED ❌"
    fi
fi

# Overall result
OVERALL_RESULT=$((PWA_RESULT + EXTENSION_RESULT))

echo ""
if [ $OVERALL_RESULT -eq 0 ]; then
    print_success "🎉 All tests passed successfully!"
    echo ""
    print_status "View detailed test report:"
    echo "  npx playwright show-report"
    echo ""
else
    print_error "❌ Some tests failed. Check the output above for details."
    echo ""
    print_status "Debugging tips:"
    echo "  1. Run with --headed to see browser actions"
    echo "  2. Run with --debug for step-by-step debugging"
    echo "  3. Check test-results/ directory for screenshots"
    echo "  4. View HTML report: npx playwright show-report"
    echo ""
fi

# Cleanup message
print_status "Test run completed. Check test-results/ for detailed output."

exit $OVERALL_RESULT