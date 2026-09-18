import userEvent from "@testing-library/user-event"
import { fireEvent, render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"
import { act, useState } from "react"
import { CommonInput } from "components/CommonInput"

function Wrapper() {
    const [val, setVal] = useState("")

    return <CommonInput value={val} placeholder="Type" onChange={(e) => setVal(e.target.value)} />
}

describe("CommonInput component", () => {
    it("renders with placeholder", () => {
        render(<CommonInput value="" placeholder="Enter text" onChange={() => {}} />)
        expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument()
    })

    it("calls onChange when typing", async () => {
        const user = userEvent.setup()
        render(<Wrapper />)
        const input = screen.getByRole("textbox") || screen.getByPlaceholderText("Type")

        await act(async () => {
            await user.type(input, "Hello")
        })

        expect(input).toHaveValue("Hello")
    })

    it("disables CommonInput when disabled prop is true", () => {
        render(<CommonInput value="" onChange={() => {}} disabled />)
        expect(screen.getByRole("textbox")).toBeDisabled()
    })
})
