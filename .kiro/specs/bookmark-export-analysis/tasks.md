# Implementation Plan: Bookmark Export and Analysis

## Overview

This implementation plan breaks down the bookmark export and analysis system into discrete coding tasks. The system will be built in TypeScript/Node.js with two main components: a bookmark exporter that retrieves data from X API and an analysis engine that processes exported bookmarks using LLM and custom scripts.

## Tasks

- [x] 1. Set up project structure and core types
  - Create TypeScript project with tsconfig.json
  - Install dependencies: twitter-api-v2, commander, ajv, fast-check, dotenv
  - Define core TypeScript interfaces: BookmarkRecord, ExportMetadata, AnalysisMetadata, EnrichedBookmarkRecord
  - Create JSON schemas for export and analysis validation
  - Set up testing framework (Jest or Vitest)
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 2. Implement X API client and authentication
  - [x] 2.1 Create XAPIClient class with authentication methods
    - Implement authenticate() using twitter-api-v2 library
    - Support OAuth 1.0a and OAuth 2.0 authentication
    - Handle credential validation and token management
    - _Requirements: 1.1_
  
  - [x] 2.2 Write unit tests for authentication
    - Test successful authentication with valid credentials
    - Test authentication failure handling (edge case)
    - _Requirements: 1.1, 1.6_
  
  - [x] 2.3 Implement getBookmarks() method with pagination
    - Fetch bookmarks using X API v2 bookmarks endpoint
    - Handle pagination with cursor-based navigation
    - Extract and transform raw API response to BookmarkRecord format
    - _Requirements: 1.2, 1.3, 2.2_
  
  - [x] 2.4 Write property test for bookmark completeness
    - **Property 1: Bookmark completeness**
    - **Validates: Requirements 1.3, 3.2**
    - _Requirements: 1.3, 3.2_

- [x] 3. Implement rate limiting and error handling
  - [x] 3.1 Create RateLimiter class
    - Track rate limit info from API responses
    - Implement waitIfNeeded() with exponential backoff
    - Handle rate limit headers (x-rate-limit-remaining, x-rate-limit-reset)
    - _Requirements: 2.1_
  
  - [x] 3.2 Write property test for rate limit compliance
    - **Property 4: Rate limit compliance**
    - **Validates: Requirements 2.1**
    - _Requirements: 2.1_
  
  - [x] 3.3 Implement error handling for API failures
    - Handle network errors with retry logic
    - Handle 404, 500 errors gracefully
    - Log errors with context (operation, bookmark ID)
    - _Requirements: 8.1_
  
  - [x] 3.4 Write property test for error logging
    - **Property 19: Error logging with context**
    - **Validates: Requirements 8.1, 8.2**
    - _Requirements: 8.1, 8.2_

- [x] 4. Implement export state management and resumability
  - [x] 4.1 Create ExportState class
    - Save state to .bookmark_export_state.json
    - Track last cursor, processed count, start time
    - Implement resume logic to continue from last cursor
    - Delete state file on successful completion
    - _Requirements: 2.3_
  
  - [x] 4.2 Write property test for resumable export
    - **Property 6: Resumable export state**
    - **Validates: Requirements 2.3**
    - _Requirements: 2.3_

- [x] 5. Implement JSON serialization and file output
  - [x] 5.1 Create BookmarkExporter class
    - Serialize bookmarks to JSON with metadata
    - Validate output against JSON schema using ajv
    - Handle null values for missing optional fields
    - Write to file with timestamp-based naming
    - Handle file collision with unique suffix
    - _Requirements: 1.4, 1.5, 3.1, 3.3, 3.4, 7.5_
  
  - [x] 5.2 Write property test for serialization round-trip
    - **Property 2: Export serialization round-trip**
    - **Validates: Requirements 1.4**
    - _Requirements: 1.4_
  
  - [x] 5.3 Write property test for schema conformance
    - **Property 7: Schema conformance**
    - **Validates: Requirements 3.1**
    - _Requirements: 3.1_
  
  - [x] 5.4 Write property test for null handling
    - **Property 8: Null handling for missing fields**
    - **Validates: Requirements 3.3**
    - _Requirements: 3.3_
  
  - [x] 5.5 Write property test for export metadata presence
    - **Property 9: Export metadata presence**
    - **Validates: Requirements 3.4**
    - _Requirements: 3.4_

- [x] 6. Implement progress reporting for export
  - [x] 6.1 Create ProgressReporter class
    - Emit progress updates at regular intervals
    - Display processed count and estimated time remaining
    - Display completion summary with total, duration, file location
    - _Requirements: 9.1, 9.2, 9.3, 2.4_
  
  - [x] 6.2 Write property test for progress reporting
    - **Property 21: Progress reporting**
    - **Validates: Requirements 9.1, 9.2**
    - _Requirements: 9.1, 9.2_
  
  - [x] 6.3 Write property test for completion summary
    - **Property 22: Completion summary**
    - **Validates: Requirements 2.4, 9.3**
    - _Requirements: 2.4, 9.3_

- [x] 7. Wire export components together and create CLI
  - [x] 7.1 Create export CLI command
    - Use commander.js for CLI interface
    - Load configuration from .bookmark-export.config.json
    - Wire together XAPIClient, RateLimiter, ExportState, BookmarkExporter, ProgressReporter
    - Handle command-line arguments (--resume, --output-dir)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 7.2 Write integration test for complete export flow
    - Test end-to-end export with mocked X API
    - Verify file creation and content
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 8. Checkpoint - Ensure export functionality works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement analysis engine core
  - [x] 9.1 Create AnalysisEngine class
    - Read and parse exported JSON files
    - Validate input against export schema
    - Orchestrate multiple analyzers (LLM, scoring, scripts)
    - Merge analysis results into bookmark records
    - _Requirements: 4.1, 6.3_
  
  - [x] 9.2 Write property test for JSON parsing validity
    - **Property 10: JSON parsing validity**
    - **Validates: Requirements 4.1**
    - _Requirements: 4.1_
  
  - [x] 9.3 Write property test for original data preservation
    - **Property 17: Original data preservation**
    - **Validates: Requirements 7.2**
    - _Requirements: 7.2_

- [x] 10. Implement LLM categorizer
  - [x] 10.1 Create LLMCategorizer class
    - Integrate with OpenAI or Anthropic SDK
    - Send bookmark text with categorization prompt
    - Parse LLM response to extract category labels
    - Add categories field to bookmark records
    - Handle LLM failures with "uncategorized" fallback
    - _Requirements: 4.2, 4.3, 4.4, 4.5_
  
  - [x] 10.2 Write property test for category field presence
    - **Property 11: Category field presence**
    - **Validates: Requirements 4.2, 4.3, 4.4**
    - _Requirements: 4.2, 4.3, 4.4_
  
  - [x] 10.3 Write unit test for LLM failure handling
    - Test "uncategorized" label on LLM timeout
    - _Requirements: 4.5_

- [x] 11. Implement usefulness scorer
  - [x] 11.1 Create UsefulnessScorer class
    - Support LLM-based scoring method
    - Support heuristic scoring using engagement metrics and recency
    - Support hybrid scoring combining both methods
    - Assign scores between 0 and 100
    - Add usefulnessScore field to bookmark records
    - _Requirements: 5.1, 5.3, 5.4, 5.5_
  
  - [x] 11.2 Write property test for usefulness score range
    - **Property 12: Usefulness score range**
    - **Validates: Requirements 5.3, 5.4**
    - _Requirements: 5.3, 5.4_
  
  - [x] 11.3 Write property test for multiple scoring methods
    - **Property 13: Multiple scoring methods**
    - **Validates: Requirements 5.5**
    - _Requirements: 5.5_

- [x] 12. Implement custom script runner
  - [x] 12.1 Create ScriptRunner class
    - Load and validate custom scripts from file paths
    - Execute scripts with exported JSON as input using child_process
    - Capture script output (stdout as JSON)
    - Validate script output against schema
    - Merge valid output into bookmark records
    - Handle script failures gracefully with error logging
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 12.2 Write property test for script execution
    - **Property 14: Script execution with correct input**
    - **Validates: Requirements 6.2**
    - _Requirements: 6.2_
  
  - [x] 12.3 Write property test for script output validation
    - **Property 16: Script output validation**
    - **Validates: Requirements 6.5**
    - _Requirements: 6.5_
  
  - [x] 12.4 Write unit test for script failure handling
    - Test error logging on script execution failure
    - _Requirements: 6.4_

- [x] 13. Implement analysis output generation
  - [x] 13.1 Create AnalysisOutputWriter class
    - Serialize enriched bookmarks to JSON
    - Include analysis metadata (timestamp, categories, scoring method)
    - Validate output against analysis schema
    - Write to file with analysis type and timestamp in filename
    - Handle file collision with unique suffix
    - _Requirements: 7.1, 7.3, 7.4, 7.5_
  
  - [x] 13.2 Write property test for analysis output completeness
    - **Property 18: Analysis output completeness**
    - **Validates: Requirements 7.1, 7.3, 7.4**
    - _Requirements: 7.1, 7.3, 7.4_

- [x] 14. Implement error handling for analysis
  - [x] 14.1 Add error handling to AnalysisEngine
    - Log errors with context during analysis
    - Continue processing remaining bookmarks on non-fatal errors
    - Write partial results on critical failures
    - Include error summary in metadata
    - _Requirements: 8.2, 8.3_
  
  - [x] 14.2 Write property test for partial results on failure
    - **Property 20: Partial results on critical failure**
    - **Validates: Requirements 8.3**
    - _Requirements: 8.3_

- [x] 15. Wire analysis components together and create CLI
  - [x] 15.1 Create analysis CLI command
    - Use commander.js for CLI interface
    - Load configuration from .bookmark-analysis.config.json
    - Wire together AnalysisEngine, LLMCategorizer, UsefulnessScorer, ScriptRunner, AnalysisOutputWriter
    - Handle command-line arguments (--input, --method, --scripts)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.3, 6.1, 6.2, 7.1_
  
  - [x] 15.2 Write integration test for complete analysis flow
    - Test end-to-end analysis with mocked LLM
    - Verify output file creation and enriched content
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.3, 7.1_

- [x] 16. Checkpoint - Ensure analysis functionality works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Add configuration file support
  - [x] 17.1 Create configuration loader
    - Load .bookmark-export.config.json for export settings
    - Load .bookmark-analysis.config.json for analysis settings
    - Support environment variables for sensitive values (API keys)
    - Validate configuration schema
    - Provide sensible defaults
    - _Requirements: 1.1, 4.2, 5.1_
  
  - [x] 17.2 Write unit tests for configuration loading
    - Test valid configuration loading
    - Test environment variable override
    - Test invalid configuration handling

- [x] 18. Add logging infrastructure
  - [x] 18.1 Create Logger class
    - Write logs to export.log and analysis.log
    - Support different log levels (info, warn, error)
    - Include timestamps and context in log entries
    - _Requirements: 8.1, 8.2_

- [x] 19. Create example scripts and documentation
  - [x] 19.1 Create example custom analysis scripts
    - Write domain-analysis.js (extract and categorize by domain)
    - Write sentiment-analysis.py (analyze tweet sentiment)
    - Document script input/output format
    - _Requirements: 6.1, 6.2_
  
  - [x] 19.2 Create README with usage examples
    - Document installation and setup
    - Document export command usage
    - Document analysis command usage
    - Document configuration options
    - Include example workflows

- [x] 20. Final checkpoint - End-to-end testing
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties (22 total)
- Unit tests validate specific examples and edge cases
- Integration tests verify component interactions
- The implementation uses TypeScript/Node.js as specified in the design
