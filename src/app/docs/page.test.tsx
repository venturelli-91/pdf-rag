/**
 * @jest-environment jsdom
 */
import { render, waitFor } from "@testing-library/react";
import DocsPage from "./page";

const mockSwaggerUIBundle = jest.fn();

jest.mock("swagger-ui-dist/swagger-ui-bundle.js", () => {
  const bundle = (...args: unknown[]) => mockSwaggerUIBundle(...args);
  bundle.presets = { apis: "apis-preset" };
  return { default: bundle };
});
jest.mock("swagger-ui-dist/swagger-ui.css", () => ({}));

describe("DocsPage", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("mounts the Swagger UI bundle pointed at the generated spec", async () => {
    render(<DocsPage />);

    await waitFor(() => {
      expect(mockSwaggerUIBundle).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/api/docs" }),
      );
    });
  });
});
