# Bug Report

This document outlines the bugs found in the OFAIR MVP project.

## 1. `users-service`: `NameError: name 'List' is not defined`

*   **File:** `services/users-service/app/services/s3_service.py`
*   **Problem:** The type hint `List` is used without being imported from the `typing` module.
*   **Fix:** Add `List` to the `typing` import. The line should be `from typing import Tuple, Optional, Dict, Any, List`.

## 2. `users-service`: `ModuleNotFoundError: No module named 'models'`

*   **File:** `services/users-service/app/services/professional_service.py`
*   **Problem:** The import `from ..models.professionals import ProfessionalStats` is failing.
*   **Explanation:** The `professional_service.py` file is trying to import `ProfessionalStats` from `services/users-service/app/models/professionals.py`, but this file does not exist. The `ProfessionalStats` model is likely defined in a shared location.
*   **Fix:** The `ProfessionalStats` model is defined in `libs/python_shared/python_shared/models/professionals.py`. The correct import in `professional_service.py` should be `from python_shared.models.professionals import ProfessionalStats`. This requires ensuring that `libs/python_shared` is in the python path. The `docker-compose.yml` file already mounts the `libs` directory, so the path should be accessible.

## 3. `users-service`: JWT Token Errors

*   **File:** `services/users-service/app/deps.py`
*   **Problem:**
    1.  `TypeError: TokenClaims.__init__() missing 1 required positional argument: 'user_id'`
    2.  `ValueError: badly formed hexadecimal UUID string`
*   **Explanation:** The `verify_token` function in `deps.py` decodes a JWT token. The decoded payload is then used to create a `TokenClaims` object. The `TypeError` indicates that the `user_id` field is missing in the JWT payload. The `ValueError` is a downstream effect of the missing `user_id`.
*   **Fix:** The `auth-service` is responsible for generating the JWT token. The `user_id` needs to be added to the token payload in the `auth-service`.

## 4. `postgres`: Database Initialization Issues

*   **Files:** `docker-compose.yml`, `scripts/init-db.sql`, `scripts/init_database.sql`, `README.md`
*   **Problem:** The `postgres` logs show that the database is not being initialized correctly. Tables are not being created.
*   **Explanation:** The `docker-compose.yml` file is configured to run `scripts/init-db.sql` on startup. However, this script only creates extensions and functions, not tables. The `README.md` file specifies that `scripts/init_database.sql` should be used to initialize the database, which contains the table creation statements.
*   **Fix:** The `docker-compose.yml` file should be updated to use `scripts/init_database.sql` instead of `scripts/init-db.sql`.

    ```yaml
    services:
      postgres:
        ...
        volumes:
          - postgres_data:/var/lib/postgresql/data
          - ./scripts/init_database.sql:/docker-entrypoint-initdb.d/init-db.sql
    ```

    Alternatively, the command from the `README.md` can be run manually after the containers are up:
    ```bash
    docker exec -i ofair_mvp-postgres-1 psql -U ofair_user -d ofair_dev < scripts/init_database.sql
    ```

## 5. E2E Tests: Hardcoded Service URLs

*   **Files:** `tests/e2e/test_customer_flow.py`, `tests/e2e/test_professional_flow.py`
*   **Problem:** The service URLs are hardcoded in the test files (e.g., `http://auth-service:8001`).
*   **Recommendation:** Externalize the service URLs to a configuration file or environment variables to make the tests more flexible and easier to maintain.

## 6. E2E Tests: Mocking and Simulation

*   **Files:** `tests/e2e/test_customer_flow.py`, `tests/e2e/test_professional_flow.py`
*   **Problem:** Some tests use simulated API calls instead of real end-to-end interactions, which reduces the reliability of the tests.
*   **Recommendation:** Replace simulated calls with real API calls. If a service is not available, it should be mocked at the HTTP level, but the test should still make a real HTTP request.

## 7. E2E Tests: Lack of Assertions

*   **Files:** `tests/e2e/test_customer_flow.py`, `tests/e2e/test_professional_flow.py`
*   **Problem:** Some tests have insufficient assertions to properly validate the responses from the services.
*   **Recommendation:** Add more specific assertions to verify the structure and content of the data returned by the API calls.

## 8. E2E Tests: No Data Cleanup

*   **Files:** `tests/e2e/test_customer_flow.py`, `tests/e2e/test_professional_flow.py`
*   **Problem:** The tests create data in the database but do not clean it up afterwards.
*   **Recommendation:** Implement a cleanup mechanism to delete test data after the tests have run. This can be done in a `cleanup` method or by using a library like `pytest-xdist` to run tests in parallel and then clean up the database.

## 9. E2E Tests: Hardcoded Test Data

*   **Files:** `tests/e2e/test_customer_flow.py`, `tests/e2e/test_professional_flow.py`
*   **Problem:** Test data is hardcoded within the test files.
*   **Recommendation:** Externalize test data to separate files (e.g., JSON or YAML) to make it easier to manage and create different test scenarios.
