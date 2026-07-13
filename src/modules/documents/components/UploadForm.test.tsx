/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UploadForm } from "./UploadForm";

function buildPdfFile(name = "report.pdf"): File {
  return new File(["%PDF-1.4 fake content"], name, { type: "application/pdf" });
}

function mockFetchResponse(status: number, body: unknown): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

describe("UploadForm", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows an error when submitting without selecting a file", async () => {
    const user = userEvent.setup();
    render(<UploadForm />);

    await user.click(screen.getByRole("button", { name: /upload/i }));

    expect(
      await screen.findByText("Select a PDF file first."),
    ).toBeInTheDocument();
  });

  it("shows the chosen file name after selecting a file", async () => {
    const user = userEvent.setup();
    render(<UploadForm />);

    const input = screen.getByLabelText(/upload a pdf/i);
    await user.upload(input, buildPdfFile());

    expect(await screen.findByText("report.pdf")).toBeInTheDocument();
  });

  it("shows a success message after a successful upload", async () => {
    mockFetchResponse(201, { id: "abc", originalName: "report.pdf", size: 10 });

    const user = userEvent.setup();
    render(<UploadForm />);

    const input = screen.getByLabelText(/upload a pdf/i);
    await user.upload(input, buildPdfFile());
    await user.click(screen.getByRole("button", { name: /upload/i }));

    expect(
      await screen.findByText("report.pdf uploaded successfully."),
    ).toBeInTheDocument();
  });

  it("shows the server error message when the upload fails", async () => {
    mockFetchResponse(400, { error: "Only PDF files are accepted." });

    const user = userEvent.setup();
    render(<UploadForm />);

    const input = screen.getByLabelText(/upload a pdf/i);
    await user.upload(input, buildPdfFile());
    await user.click(screen.getByRole("button", { name: /upload/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Only PDF files are accepted."),
      ).toBeInTheDocument();
    });
  });
});
