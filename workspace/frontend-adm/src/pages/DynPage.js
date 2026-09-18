import { Component } from 'react';
import { withRouter } from '../components/withRouter';
import { SberDynamicComponent } from '../components/sberComponents';

class DynPage extends Component {
    render() {
        const location = { ...this.props.location };

        // В случае, если basename для корневого React Router многоступенчатый (содержит несколько символов "/")
        // то при наборе урла в браузерной адресной строке например "/cubes" и нажатии Enter React автоматически заменяет урл на "/cubes/"
        // Изменить такое поведение по умолчанию невозможно
        // Для корректной обработки запроса бекендом необходимо обрезать слеш на конце
        const processedLocationPathname =
            location.pathname?.at(-1) === '/' ? location.pathname.slice(0, -1) : location.pathname;

        return (
            <SberDynamicComponent
                jsonFileName={`/dynpage${processedLocationPathname}${location.search}`}
                location={location}
            />
        );
    }
}

export default withRouter(DynPage);
