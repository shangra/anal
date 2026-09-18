import dayjs from "dayjs";
import { DateValue } from "components/MetadataForms/Inputs/DateInput/components/DatePicker/types";

export const isValidDate = (date: DateValue): date is Date => date !== null && !!dayjs(date).isValid;
