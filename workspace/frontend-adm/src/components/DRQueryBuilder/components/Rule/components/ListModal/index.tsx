import React, { Component } from 'react';
import { MetaField } from 'components/DRQueryBuilder/types';
import { Button, DeleteIcon, IconButton, PlusIcon } from 'ui-kit';
import styles from './ListModal.module.css'
import { RuleBaseInput } from 'components/DRQueryBuilder/components/Rule/components/RuleBaseInput';

interface IRefInputMetaProps {
    metaRef?: string 
}

interface Props {
    fieldType: MetaField['type'];
    initialItems: string[];
    inputMetaProps: IRefInputMetaProps;
    onSave?: (items: string[]) => void;
}

interface State {
  items: string[];
  editingIndex: number | null;
} 
 
export class ListModal extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      items: [...props.initialItems],
      editingIndex: null,
    };
  }

  handleAddItem = () => {
    const { items } = this.state;
    this.setState({
      items: [...items, ''],
    });
  };

  handleEditItem = (index: number) => {
    this.setState({
      editingIndex: index,
    });
  };

  handleRemoveItem = (index: number) => {
    const newItems = this.state.items.filter((_, i) => i !== index);
    this.setState({ items: newItems });
  };

  handleSave = () => {
    this.props.onSave?.(this.state.items);
  };

  handleChange = (index: number, value: any) => {
    this.setState(prev => {
      const newItems = [...prev.items]
      newItems[index] = value;

      return {
        items: newItems
      };
    })
  }

  render() {
    const { items } = this.state;
    
    return (
        <div className={styles.wrapper}>
          <div className={styles.header}>
            <IconButton icon={PlusIcon} onClick={this.handleAddItem}/>
          </div>
          <div className={styles.list}>
            {items.map((item, index) => (
              <div className={styles.item} key={index}>
                <RuleBaseInput
                  type={this.props.fieldType} 
                  value={item}
                  handleChange={(newValue) => this.handleChange(index, newValue)} 
                  inputMetaProps={this.props.inputMetaProps}
                /> 
                <IconButton 
                  className={styles.deteleBtn}
                  onClick={() => this.handleRemoveItem(index)} 
                  icon={DeleteIcon} 
                  color='error'
                />
              </div>
            ))}
          </div>
          <div className={styles.controls}>
            <Button onClick={this.handleSave} color='success'>Сохранить</Button>
          </div>
        </div>
    );
  }
}