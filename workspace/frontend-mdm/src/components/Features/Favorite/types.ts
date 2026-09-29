import { IconButtonProps } from "../../UIKit/IconButton";

export type Favorite = {
    
}

export type FavoriteState = {
    loading: boolean;
    favorite: boolean;
    href: string
}

export type FavoriteProps = Omit<IconButtonProps, "icon" | "loading"> & {
    location: Location;
    iconForFavorite?: string
    titleForFavorite?: string
    href?: string;
    value?: boolean
    onChange?: (value: boolean) => void

}