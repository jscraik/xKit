# Requirements Document

## Introduction

This feature enables users to export their X (Twitter) bookmarks into a structured JSON format and perform intelligent analysis on the exported data. The system consists of two main components: a bookmark export mechanism that retrieves and structures bookmark data from X, and an analysis engine that processes the exported JSON to categorize and rank bookmarks based on usefulness or custom criteria.

## Glossary

- **Bookmark_Exporter**: The component responsible for retrieving bookmark data from X and converting it to JSON format
- **Analysis_Engine**: The component that processes exported bookmark JSON data using LLM or custom scripts
- **Bookmark_Record**: A structured data object containing bookmark metadata (URL, text, author, timestamp, engagement metrics)
- **Category**: A classification label assigned to bookmarks based on content analysis
- **Usefulness_Score**: A numerical ranking (0-100) indicating the perceived value or relevance of a bookmark
- **Export_Session**: A single execution of the bookmark export process
- **Analysis_Job**: A single execution of the analysis process on exported bookmark data

## Requirements

### Requirement 1: Export Bookmarks from X

**User Story:** As a user, I want to export my X bookmarks to a JSON file, so that I can analyze and process them outside of the X platform.

#### Acceptance Criteria

1. WHEN a user initiates an export, THE Bookmark_Exporter SHALL authenticate with X using valid credentials
2. WHEN authentication succeeds, THE Bookmark_Exporter SHALL retrieve all accessible bookmarks from the user's account
3. WHEN bookmarks are retrieved, THE Bookmark_Exporter SHALL extract metadata including URL, tweet text, author information, timestamp, and engagement metrics
4. WHEN all bookmarks are processed, THE Bookmark_Exporter SHALL serialize the data into valid JSON format
5. WHEN serialization completes, THE Bookmark_Exporter SHALL write the JSON data to a file with a timestamp-based filename
6. IF authentication fails, THEN THE Bookmark_Exporter SHALL return a descriptive error message and halt the export

### Requirement 2: Handle Rate Limiting and Pagination

**User Story:** As a user with many bookmarks, I want the export process to handle X API limitations gracefully, so that I can export large bookmark collections without errors.

#### Acceptance Criteria

1. WHEN the X API returns a rate limit response, THE Bookmark_Exporter SHALL pause and retry after the specified wait period
2. WHEN bookmarks exceed a single page of results, THE Bookmark_Exporter SHALL paginate through all available pages
3. WHEN pagination is in progress, THE Bookmark_Exporter SHALL maintain state to resume from the last successful page if interrupted
4. WHEN the export completes, THE Bookmark_Exporter SHALL log the total number of bookmarks exported

### Requirement 3: Structure Bookmark Data

**User Story:** As a developer, I want bookmark data exported in a well-defined JSON schema, so that I can reliably parse and analyze the data.

#### Acceptance Criteria

1. THE Bookmark_Exporter SHALL produce JSON conforming to a documented schema
2. WHEN a bookmark is exported, THE Bookmark_Record SHALL include fields for: id, url, text, author_username, author_name, created_at, like_count, retweet_count, and reply_count
3. WHEN optional fields are unavailable, THE Bookmark_Exporter SHALL use null values rather than omitting fields
4. THE Bookmark_Exporter SHALL include a metadata section with export_timestamp, total_count, and exporter_version

### Requirement 4: Categorize Bookmarks Using LLM

**User Story:** As a user, I want my bookmarks automatically categorized by topic, so that I can organize and find relevant bookmarks easily.

#### Acceptance Criteria

1. WHEN an analysis job starts, THE Analysis_Engine SHALL read and parse the exported JSON file
2. WHEN processing each bookmark, THE Analysis_Engine SHALL send the bookmark text to an LLM with a categorization prompt
3. WHEN the LLM responds, THE Analysis_Engine SHALL extract category labels from the response
4. WHEN categorization completes, THE Analysis_Engine SHALL add a "categories" field to each Bookmark_Record
5. IF the LLM fails to respond, THEN THE Analysis_Engine SHALL mark the bookmark with a "uncategorized" label and continue processing

### Requirement 5: Rank Bookmarks by Usefulness

**User Story:** As a user, I want my bookmarks ranked by usefulness, so that I can prioritize which content to review first.

#### Acceptance Criteria

1. WHEN an analysis job includes usefulness ranking, THE Analysis_Engine SHALL evaluate each bookmark using configurable criteria
2. WHEN evaluating a bookmark, THE Analysis_Engine SHALL consider factors including content quality, relevance, engagement metrics, and recency
3. WHEN evaluation completes, THE Analysis_Engine SHALL assign a Usefulness_Score between 0 and 100
4. WHEN all bookmarks are scored, THE Analysis_Engine SHALL add a "usefulness_score" field to each Bookmark_Record
5. THE Analysis_Engine SHALL support both LLM-based and script-based scoring methods

### Requirement 6: Support Custom Analysis Scripts

**User Story:** As a developer, I want to run custom analysis scripts on exported bookmarks, so that I can implement domain-specific analysis logic.

#### Acceptance Criteria

1. THE Analysis_Engine SHALL accept custom analysis scripts as input
2. WHEN a custom script is provided, THE Analysis_Engine SHALL execute it with the exported JSON as input
3. WHEN the script completes, THE Analysis_Engine SHALL merge the script output back into the bookmark data
4. IF the script fails, THEN THE Analysis_Engine SHALL log the error and continue with remaining analysis tasks
5. THE Analysis_Engine SHALL validate that script output conforms to the expected schema before merging

### Requirement 7: Generate Analysis Output

**User Story:** As a user, I want analysis results saved to a new JSON file, so that I can review categorized and ranked bookmarks.

#### Acceptance Criteria

1. WHEN analysis completes, THE Analysis_Engine SHALL write the enriched bookmark data to a new JSON file
2. WHEN writing output, THE Analysis_Engine SHALL preserve all original bookmark fields
3. WHEN writing output, THE Analysis_Engine SHALL include analysis metadata with analysis_timestamp, categories_applied, and scoring_method
4. THE Analysis_Engine SHALL use a filename that indicates the analysis type and timestamp
5. IF the output file already exists, THEN THE Analysis_Engine SHALL append a unique suffix to avoid overwriting

### Requirement 8: Handle Errors Gracefully

**User Story:** As a user, I want clear error messages when export or analysis fails, so that I can troubleshoot and retry successfully.

#### Acceptance Criteria

1. WHEN an error occurs during export, THE Bookmark_Exporter SHALL log the error with context including the operation and bookmark ID if applicable
2. WHEN an error occurs during analysis, THE Analysis_Engine SHALL log the error and continue processing remaining bookmarks
3. WHEN critical errors prevent completion, THE system SHALL write partial results to disk with an error summary
4. THE system SHALL distinguish between recoverable errors (continue processing) and fatal errors (halt execution)

### Requirement 9: Provide Progress Feedback

**User Story:** As a user, I want to see progress during long-running exports and analysis, so that I know the system is working.

#### Acceptance Criteria

1. WHEN export or analysis is in progress, THE system SHALL output progress updates at regular intervals
2. WHEN displaying progress, THE system SHALL show the number of bookmarks processed and estimated time remaining
3. WHEN an operation completes, THE system SHALL display a summary including total items processed, duration, and output file location
