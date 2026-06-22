/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuerySession } from "./QuerySession";

function mockFetchResponse(status: number, body: unknown): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

describe("QuerySession", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows an error when submitting a blank question", async () => {
    const user = userEvent.setup();
    render(<QuerySession />);

    await user.click(screen.getByRole("button", { name: /ask/i }));

    expect(
      await screen.findByText("Type a question first."),
    ).toBeInTheDocument();
  });

  it("renders the question, answer, and citations after a successful query", async () => {
    mockFetchResponse(200, {
      answer: "Photosynthesis happens in chloroplasts.",
      grounded: true,
      citations: [
        {
          documentName: "biology.pdf",
          pageNumber: 3,
          passages: ["Light energy is converted into chemical energy."],
        },
      ],
    });

    const user = userEvent.setup();
    render(<QuerySession />);

    await user.type(
      screen.getByLabelText(/ask a question/i),
      "What is photosynthesis?",
    );
    await user.click(screen.getByRole("button", { name: /ask/i }));

    const turn = await screen.findByRole("article");
    expect(
      within(turn).getByText("What is photosynthesis?"),
    ).toBeInTheDocument();
    expect(
      within(turn).getByText("Photosynthesis happens in chloroplasts."),
    ).toBeInTheDocument();
    expect(within(turn).getByText("biology.pdf, p. 3")).toBeInTheDocument();
    expect(
      within(turn).getByText("Light energy is converted into chemical energy."),
    ).toBeInTheDocument();
  });

  it("supports asking a second consecutive question, keeping prior turns visible", async () => {
    mockFetchResponse(200, {
      answer: "First answer.",
      grounded: true,
      citations: [],
    });
    const user = userEvent.setup();
    render(<QuerySession />);

    await user.type(
      screen.getByLabelText(/ask a question/i),
      "First question?",
    );
    await user.click(screen.getByRole("button", { name: /ask/i }));
    await screen.findByText("First answer.");

    mockFetchResponse(200, {
      answer: "Second answer.",
      grounded: true,
      citations: [],
    });

    await user.type(
      screen.getByLabelText(/ask a question/i),
      "Second question?",
    );
    await user.click(screen.getByRole("button", { name: /ask/i }));
    await screen.findByText("Second answer.");

    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.getByText("First question?")).toBeInTheDocument();
    expect(screen.getByText("Second question?")).toBeInTheDocument();
  });

  it("shows the server error message when a query fails", async () => {
    mockFetchResponse(502, { error: "vector store down" });

    const user = userEvent.setup();
    render(<QuerySession />);

    await user.type(screen.getByLabelText(/ask a question/i), "query?");
    await user.click(screen.getByRole("button", { name: /ask/i }));

    await waitFor(() => {
      expect(screen.getByText("vector store down")).toBeInTheDocument();
    });
  });

  it("clears the input after asking a question", async () => {
    mockFetchResponse(200, {
      answer: "answer",
      grounded: true,
      citations: [],
    });

    const user = userEvent.setup();
    render(<QuerySession />);

    const input = screen.getByLabelText(/ask a question/i);
    await user.type(input, "question?");
    await user.click(screen.getByRole("button", { name: /ask/i }));
    await screen.findByText("answer");

    expect(input).toHaveValue("");
  });
});
