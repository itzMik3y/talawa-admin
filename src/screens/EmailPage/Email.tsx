import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import type { RootState } from 'state/reducers';
import AdminNavbar from 'components/AdminNavbar/AdminNavbar';
import { Col, Form, Row } from 'react-bootstrap';
import styles from './Email.module.css';
import Quill from 'quill';
import { ORGANIZATIONS_MEMBER_CONNECTION_LIST } from 'GraphQl/Queries/Queries';
import 'quill/dist/quill.snow.css';
import { useQuery } from '@apollo/client';
import { toast } from 'react-toastify';
import debounce from 'utils/debounce';
import type { TypedDocumentNode } from '@apollo/client';
import { CircularProgress } from '@mui/material';
import PaginationList from 'components/PaginationList/PaginationList';
import 'react-datetime/css/react-datetime.css';
import { MuiPickersUtilsProvider, DateTimePicker } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import gql from 'graphql-tag';
import { useMutation } from '@apollo/client';
import { PLUGIN_GET } from 'GraphQl/Queries/Queries';
// import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
// import type { MaterialUiPickersDate } from '@material-ui/pickers';

interface InterfaceMember {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  organizationsBlockedBy: {
    _id: string;
    __typename: 'Organization';
  }[];
}
const SEND_EMAIL_MUTATION = gql`
  mutation SendEmail(
    $subject: String!
    $text: String!
    $emailList: [EmailAddress!]
    $scheduledTime: String
  ) {
    sendEmailToUsers(
      subject: $subject
      text: $text
      emailList: $emailList
      scheduledTime: $scheduledTime
    ) {
      message
    }
  }
`;
function emailPage(): JSX.Element {
  const { t } = useTranslation('translation', {
    keyPrefix: 'blockUnblockUser',
  });

  document.title = t('title');
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [emailList, setEmailList] = useState<string[]>([]); // You can set up a method to gather multiple emails

  const [sendEmail] = useMutation(SEND_EMAIL_MUTATION);
  const [emailSubject, setEmailSubject] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [userTypedEmails, setUserTypedEmails] = useState<string>('');
  const [selectedCCEmails, setSelectedCCEmails] = useState<string[]>([]);
  const [userTypedCCEmails, setUserTypedCCEmails] = useState<string>('');

  const [scheduledTime, setScheduledTime] = useState<string | null>(null);
  const currentUrl = window.location.href.split('=')[1];
  const appRoutes = useSelector((state: RootState) => state.appRoutes);
  const plugins = useQuery(PLUGIN_GET);
  const { targets, configUrl } = appRoutes;

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const [editor, setEditor] = useState<Quill | null>(null);
  const [organizationId, setOrganizationId] = useState<string | undefined>();

  const [state, setState] = useState(0);
  const [membersData, setMembersData] = useState<InterfaceMember[]>([]);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    recipient: '',
    subject: '',
    body: '',
    scheduledTime: new Date(), // set the default time as now
  });
  const {
    data: memberData,
    loading: memberLoading,
    error: memberError,
    refetch: memberRefetch,
  } = useQuery(ORGANIZATIONS_MEMBER_CONNECTION_LIST, {
    variables: {
      orgId: currentUrl,
      firstName_contains: '',
      lastName_contains: '',
    },
  });
  useEffect(() => {
    console.log(plugins);
    if (!memberData) {
      setMembersData([]);
      return;
    }

    setMembersData(memberData?.organizationsMemberConnection.edges);

    if (organizationId !== undefined) {
      memberRefetch({
        orgId: organizationId,
        firstName_contains: firstNameRef.current?.value ?? '',
        lastName_contains: lastNameRef.current?.value ?? '',
      });
    }
  }, [state, memberData, organizationId]);
  const [activeSection, setActiveSection] = useState('Content');

  const handleSendEmail = async (): Promise<void> => {
    const content = editor?.root.innerHTML || '';
    const variables = {
      subject: emailSubject,
      text: content,
      emailList: selectedEmails,
      ...(scheduledTime ? { scheduledTime } : {}),
    };

    try {
      const response = await sendEmail({ variables });
      // await sendEmail({ variables });
      console.log('Response Data:', response.data);
      toast.success('Emails sent successfully!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error sending emails!');
    }
  };

  useEffect(() => {
    if (!editor) {
      const quill = new Quill('#editor', {
        theme: 'snow',
        modules: {
          toolbar: [
            [{ font: [] }, { size: [] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ color: [] }, { background: [] }],
            [{ script: 'sub' }, { script: 'super' }],
            [{ header: '1' }, { header: '2' }, 'blockquote', 'code-block'],
            [
              { list: 'ordered' },
              { list: 'bullet' },
              { indent: '-1' },
              { indent: '+1' },
            ],
            ['direction', { align: [] }],
            ['link', 'image', 'video', 'formula'],
            ['clean'],
          ],
        },
      });
      setEditor(quill);
    }
  }, [editor, activeSection]);

  const handleDateChange = (date: any): void => {
    if (date && date instanceof Date) {
      setFormData((prevData) => ({
        ...prevData,
        scheduledTime: date,
      }));
    }
  };

  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number
  ): void => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  if (memberError) {
    toast.error(memberError.message);
  }
  const handleSearch = (): void => {
    let orgSearch = currentUrl;
    if (organizationId !== undefined) {
      orgSearch = organizationId;
    }
    const filterData = {
      orgId: orgSearch,
      firstName_contains: firstNameRef.current?.value ?? '',
      lastName_contains: lastNameRef.current?.value ?? '',
      email_contains: emailRef.current?.value ?? '',
    };

    memberRefetch(filterData);
  };

  const handleSearchDebounced = debounce(handleSearch);

  // Function to set the active section
  const handleSectionClick = (section: string): void => {
    setActiveSection(section);
  };
  const handleCheckboxChange = (email: string): void => {
    setSelectedEmails((prevSelected) => {
      if (prevSelected.includes(email)) {
        return prevSelected.filter((e) => e !== email);
      } else {
        return [...prevSelected, email];
      }
    });
  };
  const handleCCCheckboxChange = (email: string): void => {
    setSelectedCCEmails((prevSelected) => {
      if (prevSelected.includes(email)) {
        return prevSelected.filter((e) => e !== email);
      } else {
        return [...prevSelected, email];
      }
    });
  };

  return (
    <>
      <AdminNavbar targets={targets} url1={configUrl} />
      <div className={styles.email_controls}>
        <div className={styles.recipients_box}>
          {/* <header>Recipients</header> */}
          <div className={styles.recipients_list}>
            <h6 className={styles.searchtitle}>{t('searchByName')}</h6>
            <div className={styles.sidebarsticky}>
              <Form.Control
                type="name"
                id="firstName"
                placeholder={t('searchFirstName')}
                name="firstName_contains"
                data-testid="searchByFirstName"
                autoComplete="off"
                onChange={handleSearchDebounced}
                ref={firstNameRef}
              />

              <Form.Control
                type="name"
                id="lastName"
                placeholder={t('searchLastName')}
                name="lastName_contains"
                data-testid="searchByLastName"
                autoComplete="off"
                onChange={handleSearchDebounced}
                ref={lastNameRef}
              />
            </div>

            {memberLoading ? (
              <div className={styles.loader}>
                <CircularProgress />
              </div>
            ) : (
              <div className={styles.list_box}>
                <div className="table-responsive">
                  <table
                    className={`table table-hover ${styles.userListTable}`}
                  >
                    <thead>
                      <tr>
                        <th scope="col">#</th>
                        <th scope="col">Name</th>
                        <th scope="col">Email</th>
                        <th scope="col">Add</th>
                        <th scope="col">CC</th>
                      </tr>
                    </thead>

                    <tbody>
                      {
                        /* istanbul ignore next */
                        (rowsPerPage > 0
                          ? membersData.slice(
                              page * rowsPerPage,
                              page * rowsPerPage + rowsPerPage
                            )
                          : membersData
                        ).map((user, index: number) => {
                          return (
                            <tr key={user._id} className={styles.btn_box}>
                              <th scope="row">{page * 10 + (index + 1)}</th>
                              <td>{`${user.firstName} ${user.lastName}`}</td>
                              <td>{user.email}</td>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={selectedEmails.includes(user.email)}
                                  onChange={(): void =>
                                    handleCheckboxChange(user.email)
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={selectedCCEmails.includes(
                                    user.email
                                  )}
                                  onChange={(): void =>
                                    handleCCCheckboxChange(user.email)
                                  }
                                />
                              </td>
                            </tr>
                          );
                        })
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className={styles.pagination_controls}>
              <table
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <tbody>
                  <tr>
                    <PaginationList
                      count={membersData.length}
                      rowsPerPage={rowsPerPage}
                      page={page}
                      onPageChange={handleChangePage}
                      onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className={styles.email_setup}>
          <ul className={styles.email_content_controls}>
            <li
              onClick={(): void => handleSectionClick('Content')}
              className={activeSection === 'Content' ? styles.active : ''}
            >
              Content
            </li>
            {/* <li
              onClick={(): void => handleSectionClick('Load Template')}
              className={activeSection === 'Load Template' ? styles.active : ''}
            >
              Load Template
            </li>
            <li
              onClick={(): void => handleSectionClick('Load Context')}
              className={activeSection === 'Load Context' ? styles.active : ''}
            >
              Import Template
            </li> */}
            <li
              onClick={(): void => handleSectionClick('Schedule')}
              className={activeSection === 'Schedule' ? styles.active : ''}
            >
              Attach File
            </li>
          </ul>
          {activeSection === 'Content' && (
            <div className={styles.section}>
              <div className={styles.recipients_set_up}>
                <button className={styles.sendbtn}>
                  {/* <i className="fa-sharp fa-light fa-paper-plane-top"></i> */}
                  <i
                    className={'fas fa-paper-plane fa-2x'}
                    onClick={handleSendEmail}
                  />
                  Send
                  <MuiPickersUtilsProvider utils={DateFnsUtils}>
                    <DateTimePicker
                      className={styles.date_picker}
                      label=""
                      value={formData.scheduledTime}
                      onChange={handleDateChange}
                      format="MM/dd/yyyy HH:mm aa"
                      showTodayButton
                      style={{
                        cursor: 'pointer',
                        width: '40px',
                        overflowX: 'scroll',
                      }}
                    />
                  </MuiPickersUtilsProvider>
                </button>
                {/* <div className={styles.calender_box}> */}

                {/* </div> */}
                <div className={styles.recipients_content}>
                  <div className={styles.recipients_list_box}>
                    <label className={styles.recipients_label}>To</label>
                    <input
                      value={`${selectedEmails.join(', ')}${userTypedEmails}`}
                      onChange={(e): void => setUserTypedEmails(e.target.value)}
                    />
                  </div>
                  <div className={styles.recipients_list_box}>
                    <label className={styles.recipients_label}>CC</label>
                    <input
                      value={`${selectedCCEmails.join(
                        ', '
                      )}${userTypedCCEmails}`}
                      onChange={(e): void =>
                        setUserTypedCCEmails(e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.recipients_list_box}>
                    <label className={styles.recipients_label}>Subject</label>
                    <input
                      value={emailSubject}
                      onChange={(e): void => setEmailSubject(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* <textarea rows={10}></textarea> */}
              <div
                id="editor"
                style={{ height: '80%', width: '100%', overflowY: 'scroll' }}
              ></div>
            </div>
          )}
          {activeSection === 'Load Template' && (
            <div className={styles.section}>
              {/* Load Template section */}
              {/* ... */}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default emailPage;
