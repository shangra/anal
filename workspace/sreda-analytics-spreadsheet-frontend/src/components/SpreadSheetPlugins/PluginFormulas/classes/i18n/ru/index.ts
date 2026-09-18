import args from './args';
import description from './description';
import error from './error';
import names from './names';

const format = (formula: string) => {
    let formated = formula;
    formated = formated.replace(/;/g, ',');
    return formated;
};

export default { args, description, error, names, format };
