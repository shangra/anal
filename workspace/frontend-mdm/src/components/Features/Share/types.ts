import { IconButtonProps } from 'ui-kit';

export type ShareProps = Omit<IconButtonProps, "icon" | "loading"> & {
    location: Location;
}